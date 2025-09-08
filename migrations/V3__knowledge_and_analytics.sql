-- V3__knowledge_and_analytics.sql
USE [OpsGraph];
GO

-- Knowledge Base Articles
IF OBJECT_ID('app.KnowledgeArticles','U') IS NULL
CREATE TABLE app.KnowledgeArticles (
    article_id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    category_id INT NOT NULL,
    asset_type NVARCHAR(60) NULL,
    tags NVARCHAR(MAX) NULL,
    solution_steps NVARCHAR(MAX) NULL,
    resolution_time_mins INT NULL,
    success_rate DECIMAL(5,2) NULL,
    view_count INT NOT NULL DEFAULT 0,
    help_count INT NOT NULL DEFAULT 0,
    created_by INT NOT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_published BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES app.Categories(category_id),
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id),
    FOREIGN KEY (updated_by) REFERENCES app.Users(user_id)
);
GO

-- Knowledge Base Article References
IF OBJECT_ID('app.ArticleReferences','U') IS NULL
CREATE TABLE app.ArticleReferences (
    reference_id INT IDENTITY(1,1) PRIMARY KEY,
    article_id INT NOT NULL,
    ticket_id INT NOT NULL,
    was_helpful BIT NULL,
    applied_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    resolution_time_mins INT NULL,
    FOREIGN KEY (article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (ticket_id) REFERENCES app.Tickets(ticket_id)
);
GO

-- Asset Impact Analysis
IF OBJECT_ID('app.AssetImpactScores','U') IS NULL
CREATE TABLE app.AssetImpactScores (
    asset_id INT NOT NULL PRIMARY KEY,
    business_impact_score DECIMAL(5,2) NOT NULL,
    failure_frequency_score DECIMAL(5,2) NOT NULL,
    mean_time_to_repair_mins INT NULL,
    mean_time_between_failures_hours INT NULL,
    availability_percentage DECIMAL(5,2) NULL,
    downstream_dependencies INT NULL,
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (asset_id) REFERENCES app.Assets(asset_id)
);
GO

-- Predictive Maintenance Rules
IF OBJECT_ID('app.MaintenanceRules','U') IS NULL
CREATE TABLE app.MaintenanceRules (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    asset_type NVARCHAR(60) NOT NULL,
    condition_pattern NVARCHAR(MAX) NOT NULL,
    prediction_window_hours INT NOT NULL,
    confidence_threshold DECIMAL(5,2) NOT NULL,
    action_description NVARCHAR(MAX) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Maintenance Predictions
IF OBJECT_ID('app.MaintenancePredictions','U') IS NULL
CREATE TABLE app.MaintenancePredictions (
    prediction_id INT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL,
    rule_id INT NOT NULL,
    predicted_failure_at DATETIME2(3) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    contributing_factors NVARCHAR(MAX) NULL,
    ticket_id INT NULL,
    was_accurate BIT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (asset_id) REFERENCES app.Assets(asset_id),
    FOREIGN KEY (rule_id) REFERENCES app.MaintenanceRules(rule_id),
    FOREIGN KEY (ticket_id) REFERENCES app.Tickets(ticket_id)
);
GO

-- Root Cause Categories
IF OBJECT_ID('app.RootCauseCategories','U') IS NULL
CREATE TABLE app.RootCauseCategories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL
);
GO

-- Insert some common root cause categories
INSERT INTO app.RootCauseCategories (name, description) VALUES
('Hardware Failure', 'Physical component failures or degradation'),
('Software Bug', 'Application or system software defects'),
('Configuration Error', 'Misconfigurations or invalid settings'),
('Network Issue', 'Connectivity or network performance problems'),
('Human Error', 'Mistakes in operation or maintenance'),
('Resource Exhaustion', 'CPU, memory, disk space, or other resource limits'),
('External Dependency', 'Third-party service or vendor issues'),
('Security Incident', 'Security breaches or vulnerabilities'),
('Environmental', 'Power, cooling, or physical environment issues'),
('Unknown', 'Root cause could not be determined');
GO

-- Root Cause Analysis
IF OBJECT_ID('app.RootCauseAnalysis','U') IS NULL
CREATE TABLE app.RootCauseAnalysis (
    analysis_id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    category_id INT NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    contributing_factors NVARCHAR(MAX) NULL,
    corrective_actions NVARCHAR(MAX) NULL,
    preventive_measures NVARCHAR(MAX) NULL,
    analyzed_by INT NOT NULL,
    analyzed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY (category_id) REFERENCES app.RootCauseCategories(category_id),
    FOREIGN KEY (analyzed_by) REFERENCES app.Users(user_id)
);
GO

-- Real-time Metrics Views
IF OBJECT_ID('app.vw_TicketMetrics', 'V') IS NOT NULL
    DROP VIEW app.vw_TicketMetrics;
GO

CREATE VIEW app.vw_TicketMetrics AS
WITH ticket_stats AS (
    SELECT 
        DATEADD(HOUR, DATEDIFF(HOUR, 0, created_at), 0) as hour_bucket,
        COUNT(*) as new_tickets,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_tickets,
        AVG(CASE 
            WHEN status = 'Closed' 
            THEN DATEDIFF(MINUTE, created_at, updated_at)
            ELSE NULL 
        END) as avg_resolution_time_mins,
        COUNT(DISTINCT site_id) as affected_sites,
        STRING_AGG(priority, ',') WITHIN GROUP (ORDER BY priority) as priorities
    FROM app.Tickets
    WHERE created_at >= DATEADD(DAY, -7, SYSUTCDATETIME())
    GROUP BY DATEADD(HOUR, DATEDIFF(HOUR, 0, created_at), 0)
)
SELECT 
    hour_bucket,
    new_tickets,
    closed_tickets,
    avg_resolution_time_mins,
    affected_sites,
    priorities,
    new_tickets - closed_tickets as ticket_delta,
    SUM(new_tickets) OVER (ORDER BY hour_bucket) as cumulative_tickets,
    AVG(new_tickets) OVER (
        ORDER BY hour_bucket 
        ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
    ) as moving_avg_24h
FROM ticket_stats;
GO

-- Add stored procedure for smart article recommendations
IF OBJECT_ID('app.usp_GetKnowledgeRecommendations', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_GetKnowledgeRecommendations;
GO

CREATE PROCEDURE app.usp_GetKnowledgeRecommendations
    @ticket_id INT,
    @max_results INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    -- Get ticket details
    DECLARE @category_id INT, @asset_type NVARCHAR(60), @description NVARCHAR(MAX);
    SELECT 
        @category_id = t.category_id,
        @asset_type = a.type,
        @description = td.description
    FROM app.Tickets t
    JOIN app.TicketDetails td ON t.ticket_id = td.ticket_id
    LEFT JOIN app.Assets a ON t.asset_id = a.asset_id
    WHERE t.ticket_id = @ticket_id;

    -- Find relevant articles using a scoring algorithm
    WITH scored_articles AS (
        SELECT 
            ka.article_id,
            ka.title,
            ka.content,
            ka.solution_steps,
            ka.resolution_time_mins,
            ka.success_rate,
            (
                CASE WHEN ka.category_id = @category_id THEN 50 ELSE 0 END +
                CASE WHEN ka.asset_type = @asset_type THEN 30 ELSE 0 END +
                CASE WHEN ka.help_count > 0 THEN 20 ELSE 0 END +
                CASE WHEN ka.success_rate >= 80 THEN 20 ELSE 0 END
            ) as relevance_score
        FROM app.KnowledgeArticles ka
        WHERE ka.is_published = 1
        AND (
            ka.category_id = @category_id
            OR ka.asset_type = @asset_type
            OR EXISTS (
                -- Look for articles that helped similar tickets
                SELECT 1 
                FROM app.ArticleReferences ar
                JOIN app.Tickets t2 ON ar.ticket_id = t2.ticket_id
                WHERE ar.article_id = ka.article_id
                AND t2.category_id = @category_id
                AND ar.was_helpful = 1
            )
        )
    )
    SELECT TOP(@max_results)
        article_id,
        title,
        content,
        solution_steps,
        resolution_time_mins,
        success_rate,
        relevance_score
    FROM scored_articles
    ORDER BY relevance_score DESC, success_rate DESC;
END;
GO

-- Add stored procedure for impact analysis
IF OBJECT_ID('app.usp_AnalyzeAssetImpact', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_AnalyzeAssetImpact;
GO

CREATE PROCEDURE app.usp_AnalyzeAssetImpact
    @asset_id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Calculate impact metrics
    WITH ticket_stats AS (
        SELECT
            COUNT(*) as total_tickets,
            AVG(DATEDIFF(MINUTE, created_at, 
                CASE WHEN status = 'Closed' THEN updated_at 
                ELSE SYSUTCDATETIME() END)) as avg_repair_time,
            MAX(priority) as highest_priority
        FROM app.Tickets
        WHERE asset_id = @asset_id
        AND created_at >= DATEADD(MONTH, -6, SYSUTCDATETIME())
    ),
    dependency_count AS (
        SELECT COUNT(*) as downstream_count
        FROM kg.Edges e
        WHERE e.from_id = @asset_id
        AND e.edge_type IN ('FEEDS_POWER', 'CONNECTS_TO', 'CONTROLS')
    ),
    failure_intervals AS (
        SELECT 
            event_id,
            occurred_at,
            DATEDIFF(HOUR, LAG(occurred_at) OVER (ORDER BY occurred_at), occurred_at) as hours_since_last
        FROM app.Events
        WHERE asset_id = @asset_id
        AND level IN ('Error', 'Critical')
        AND occurred_at >= DATEADD(MONTH, -6, SYSUTCDATETIME())
    )
    UPDATE app.AssetImpactScores
    SET
        business_impact_score = (
            CASE 
                WHEN ts.highest_priority = 'P1' THEN 100
                WHEN ts.highest_priority = 'P2' THEN 75
                WHEN ts.highest_priority = 'P3' THEN 50
                WHEN ts.highest_priority = 'P4' THEN 25
                ELSE 10
            END
        ),
        failure_frequency_score = (
            CASE 
                WHEN ts.total_tickets >= 10 THEN 100
                ELSE ts.total_tickets * 10
            END
        ),
        mean_time_to_repair_mins = ts.avg_repair_time,
        mean_time_between_failures_hours = (
            SELECT AVG(hours_since_last)
            FROM failure_intervals
            WHERE hours_since_last IS NOT NULL
        ),
        availability_percentage = (
            SELECT 100 - (
                SUM(DATEDIFF(MINUTE, created_at, 
                    CASE WHEN status = 'Closed' 
                    THEN updated_at 
                    ELSE SYSUTCDATETIME() END)) * 100.0 / 
                (DATEDIFF(MINUTE, DATEADD(MONTH, -6, SYSUTCDATETIME()), SYSUTCDATETIME()))
            )
            FROM app.Tickets
            WHERE asset_id = @asset_id
            AND status IN ('Open', 'InProgress', 'Closed')
            AND created_at >= DATEADD(MONTH, -6, SYSUTCDATETIME())
        ),
        downstream_dependencies = dc.downstream_count,
        updated_at = SYSUTCDATETIME()
    FROM ticket_stats ts
    CROSS JOIN dependency_count dc
    WHERE asset_id = @asset_id;

    -- Return the updated impact analysis
    SELECT * FROM app.AssetImpactScores WHERE asset_id = @asset_id;
END;
GO
