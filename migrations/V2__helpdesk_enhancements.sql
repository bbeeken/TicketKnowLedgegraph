-- V2__helpdesk_enhancements.sql
USE [OpsGraph];
GO

-- Priority-based SLA plans
IF OBJECT_ID('app.SLAMatrix','U') IS NULL
CREATE TABLE app.SLAMatrix (
    id INT IDENTITY(1,1) PRIMARY KEY,
    priority NVARCHAR(10) NOT NULL,
    severity NVARCHAR(20) NOT NULL,
    first_response_hours INT NOT NULL,
    resolution_hours INT NOT NULL,
    business_hours_only BIT NOT NULL DEFAULT 1,
    UNIQUE (priority, severity)
);
GO

-- Populate default SLA matrix
INSERT INTO app.SLAMatrix (priority, severity, first_response_hours, resolution_hours, business_hours_only)
VALUES 
('P1', 'Critical', 1, 4, 0),    -- 24/7 support for P1/Critical
('P1', 'High', 2, 8, 0),        -- 24/7 for P1/High
('P1', 'Medium', 4, 24, 1),
('P1', 'Low', 8, 48, 1),
('P2', 'Critical', 2, 8, 0),
('P2', 'High', 4, 24, 1),
('P2', 'Medium', 8, 48, 1),
('P2', 'Low', 16, 72, 1),
('P3', 'Critical', 4, 24, 1),
('P3', 'High', 8, 48, 1),
('P3', 'Medium', 16, 72, 1),
('P3', 'Low', 24, 96, 1),
('P4', 'Critical', 8, 48, 1),
('P4', 'High', 16, 72, 1),
('P4', 'Medium', 24, 96, 1),
('P4', 'Low', 40, 120, 1);
GO

-- Ticket Templates
IF OBJECT_ID('app.TicketTemplates','U') IS NULL
CREATE TABLE app.TicketTemplates (
    template_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    priority NVARCHAR(10) NOT NULL,
    severity NVARCHAR(20) NOT NULL,
    summary_template NVARCHAR(200) NOT NULL,
    description_template NVARCHAR(MAX) NOT NULL,
    checklist_items NVARCHAR(MAX) NULL,
    quick_actions NVARCHAR(MAX) NULL,
    auto_assign_team INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (category_id) REFERENCES app.Categories(category_id),
    FOREIGN KEY (auto_assign_team) REFERENCES app.Teams(team_id)
);
GO

-- Auto-assignment Rules
IF OBJECT_ID('app.AssignmentRules','U') IS NULL
CREATE TABLE app.AssignmentRules (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    priority INT NOT NULL DEFAULT 100,
    category_id INT NULL,
    asset_type NVARCHAR(60) NULL,
    site_id INT NULL,
    min_priority NVARCHAR(10) NULL,
    min_severity NVARCHAR(20) NULL,
    assign_to_team INT NULL,
    assign_to_user INT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (category_id) REFERENCES app.Categories(category_id),
    FOREIGN KEY (site_id) REFERENCES app.Sites(site_id),
    FOREIGN KEY (assign_to_team) REFERENCES app.Teams(team_id),
    FOREIGN KEY (assign_to_user) REFERENCES app.Users(user_id)
);
GO

-- Ticket Checklist Items
IF OBJECT_ID('app.TicketChecklists','U') IS NULL
CREATE TABLE app.TicketChecklists (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    item_text NVARCHAR(500) NOT NULL,
    is_completed BIT NOT NULL DEFAULT 0,
    completed_by INT NULL,
    completed_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY (completed_by) REFERENCES app.Users(user_id)
);
GO

-- Add stored procedure for auto-assignment
IF OBJECT_ID('app.usp_AutoAssignTicket', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_AutoAssignTicket;
GO

CREATE PROCEDURE app.usp_AutoAssignTicket
    @ticket_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @category_id INT, @site_id INT, @priority NVARCHAR(10), @severity NVARCHAR(20);
    
    -- Get ticket details
    SELECT @category_id = category_id, @site_id = site_id, 
           @priority = priority, @severity = severity
    FROM app.Tickets 
    WHERE ticket_id = @ticket_id;

    -- Find matching assignment rule
    WITH ranked_rules AS (
        SELECT TOP 1
            rule_id,
            assign_to_team,
            assign_to_user,
            priority as rule_priority
        FROM app.AssignmentRules
        WHERE is_active = 1
        AND (category_id IS NULL OR category_id = @category_id)
        AND (site_id IS NULL OR site_id = @site_id)
        AND (min_priority IS NULL OR min_priority <= @priority)
        AND (min_severity IS NULL OR min_severity <= @severity)
        ORDER BY priority ASC
    )
    INSERT INTO app.TicketAssignments (
        ticket_id, user_id, team_id, assigned_at
    )
    SELECT 
        @ticket_id,
        assign_to_user,
        assign_to_team,
        SYSUTCDATETIME()
    FROM ranked_rules;

    -- Set initial SLA based on priority/severity
    INSERT INTO app.TicketSLAs (
        ticket_id, 
        sla_plan_id,
        target_at
    )
    SELECT 
        @ticket_id,
        1, -- Default SLA plan
        DATEADD(HOUR, 
            CASE WHEN m.business_hours_only = 1 
                 THEN m.resolution_hours * 2 -- Rough estimate for business hours
                 ELSE m.resolution_hours 
            END,
            SYSUTCDATETIME())
    FROM app.SLAMatrix m
    WHERE m.priority = @priority
    AND m.severity = @severity;
END;
GO

-- Add stored procedure for escalating tickets
IF OBJECT_ID('app.usp_EscalateOverdueTickets', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_EscalateOverdueTickets;
GO

CREATE PROCEDURE app.usp_EscalateOverdueTickets
AS
BEGIN
    SET NOCOUNT ON;

    -- Find tickets past their SLA
    WITH overdue_tickets AS (
        SELECT 
            t.ticket_id,
            t.priority,
            t.severity,
            t.category_id,
            s.target_at,
            DATEDIFF(HOUR, s.target_at, SYSUTCDATETIME()) as hours_overdue
        FROM app.Tickets t
        JOIN app.TicketSLAs s ON t.ticket_id = s.ticket_id
        WHERE t.status NOT IN ('Closed', 'Resolved')
        AND s.target_at < SYSUTCDATETIME()
        AND s.breached = 0
    )
    UPDATE app.TicketSLAs
    SET 
        breached = 1,
        computed_at = SYSUTCDATETIME()
    FROM app.TicketSLAs s
    JOIN overdue_tickets o ON s.ticket_id = o.ticket_id;

    -- Create escalation comments
    INSERT INTO app.TicketComments (
        ticket_id,
        comment_type,
        body,
        created_by,
        created_at
    )
    SELECT 
        t.ticket_id,
        'System',
        CONCAT('Ticket has exceeded SLA target by ', 
               t.hours_overdue, 
               ' hours. Priority: ', t.priority,
               ', Severity: ', t.severity),
        1, -- System user
        SYSUTCDATETIME()
    FROM overdue_tickets t;
END;
GO
