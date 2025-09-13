-- 18_messaging_and_types.sql
-- Adds: ticket types on Tickets, messaging enhancements, vendor service requests
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Ensure TicketTypes table exists (11_ticket_master creates it too; keep idempotent seeds here)
IF OBJECT_ID('app.TicketTypes','U') IS NULL
CREATE TABLE app.TicketTypes (
    type_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    default_priority TINYINT NULL REFERENCES app.TicketPriorities(priority_id)
);
GO

-- Add type_id to Tickets if missing
IF OBJECT_ID('app.Tickets','U') IS NOT NULL AND COL_LENGTH('app.Tickets','type_id') IS NULL
    ALTER TABLE app.Tickets ADD type_id INT NULL REFERENCES app.TicketTypes(type_id);
GO

-- Seed requested ticket types
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'app.TicketTypes') AND type = 'U')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app.TicketTypes WHERE name = N'Help Request')
        INSERT INTO app.TicketTypes(name) VALUES (N'Help Request');
    IF NOT EXISTS (SELECT 1 FROM app.TicketTypes WHERE name = N'User Change Request')
        INSERT INTO app.TicketTypes(name) VALUES (N'User Change Request');
    IF NOT EXISTS (SELECT 1 FROM app.TicketTypes WHERE name = N'Purchase Request')
        INSERT INTO app.TicketTypes(name) VALUES (N'Purchase Request');
    IF NOT EXISTS (SELECT 1 FROM app.TicketTypes WHERE name = N'Vendor Service Request')
        INSERT INTO app.TicketTypes(name) VALUES (N'Vendor Service Request');
END
GO

-- Ensure TicketMaster has type_id (11_ticket_master already has); skip if present
-- (No-op if exists)
IF OBJECT_ID('app.TicketMaster','U') IS NOT NULL AND COL_LENGTH('app.TicketMaster','type_id') IS NULL
    ALTER TABLE app.TicketMaster ADD type_id INT NULL REFERENCES app.TicketTypes(type_id);
GO

-- Update TicketMaster trigger to also sync type_id
CREATE OR ALTER TRIGGER app.TicketMaster_InsertFromTickets
ON app.Tickets
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    MERGE INTO app.TicketMaster AS tgt
    USING (
        SELECT t.ticket_id, t.ticket_no, t.external_ref, t.status, t.substatus_code, t.severity, t.category_id, t.summary, t.description, t.site_id, t.created_by, t.assignee_user_id, t.team_id, t.vendor_id, t.due_at, t.sla_plan_id, t.type_id, t.created_at, t.updated_at
        FROM inserted t
    ) AS src
    ON tgt.ticket_id = src.ticket_id
    WHEN MATCHED THEN
        UPDATE SET status = src.status,
                   substatus_code = src.substatus_code,
                   severity = src.severity,
                   category_id = src.category_id,
                   summary = src.summary,
                   description = src.description,
                   site_id = src.site_id,
                   assignee_user_id = src.assignee_user_id,
                   team_id = src.team_id,
                   vendor_id = src.vendor_id,
                   due_at = src.due_at,
                   sla_plan_id = src.sla_plan_id,
                   type_id = src.type_id,
                   updated_at = src.updated_at
    WHEN NOT MATCHED THEN
        INSERT (ticket_id, ticket_no, external_ref, status, substatus_code, priority, severity, category_id, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id, type_id, created_at, updated_at)
        VALUES (src.ticket_id, src.ticket_no, src.external_ref, src.status, src.substatus_code, NULL, src.severity, src.category_id, src.summary, src.description, src.site_id, src.created_by, src.assignee_user_id, src.team_id, src.vendor_id, src.due_at, src.sla_plan_id, src.type_id, src.created_at, src.updated_at);
END
GO

-- Messaging: extend TicketComments with message_type, create read receipts
IF OBJECT_ID('app.TicketComments','U') IS NOT NULL AND COL_LENGTH('app.TicketComments','message_type') IS NULL
    ALTER TABLE app.TicketComments ADD message_type NVARCHAR(20) NOT NULL CONSTRAINT DF_TicketComments_MessageType DEFAULT 'comment';
GO

IF OBJECT_ID('app.TicketMessageReads','U') IS NULL
CREATE TABLE app.TicketMessageReads (
    ticket_id INT NOT NULL,
    comment_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    read_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY(ticket_id, comment_id, user_id),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(comment_id) REFERENCES app.TicketComments(comment_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id)
);
GO

-- Proc: Add ticket message (supports types: comment, status_update, internal, vendor_note)
CREATE OR ALTER PROCEDURE app.usp_AddTicketMessage
    @ticket_id INT,
    @author_id INT,
    @message_type NVARCHAR(20),
    @body NVARCHAR(MAX),
    @visibility NVARCHAR(16) = 'public'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM app.Tickets WHERE ticket_id=@ticket_id)
            RAISERROR('Invalid ticket_id', 16, 1);
        INSERT INTO app.TicketComments (ticket_id, author_id, body, visibility, message_type, created_at)
        VALUES (@ticket_id, @author_id, @body, @visibility, @message_type, SYSUTCDATETIME());
        DECLARE @cid BIGINT = SCOPE_IDENTITY();
        -- history and outbox
    DECLARE @meta NVARCHAR(MAX) = (SELECT @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    INSERT INTO app.TicketHistory (ticket_id, change_type, new_value, changed_by, metadata)
    VALUES (@ticket_id, 'message', @body, @author_id, @meta);
    DECLARE @payloadMsg NVARCHAR(MAX) = (SELECT @ticket_id AS ticket_id, @cid AS comment_id, @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
    VALUES ('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'ticket.message', @payloadMsg);
        SELECT @cid AS comment_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddTicketMessage', CONVERT(NVARCHAR(64), @ticket_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Proc: Mark ticket message read
CREATE OR ALTER PROCEDURE app.usp_MarkTicketMessageRead
    @ticket_id INT,
    @comment_id BIGINT,
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM app.TicketComments WHERE comment_id=@comment_id AND ticket_id=@ticket_id)
        RAISERROR('Invalid ticket/comment', 16, 1);
    IF NOT EXISTS (SELECT 1 FROM app.TicketMessageReads WHERE ticket_id=@ticket_id AND comment_id=@comment_id AND user_id=@user_id)
        INSERT INTO app.TicketMessageReads(ticket_id, comment_id, user_id) VALUES(@ticket_id, @comment_id, @user_id);
END
GO

-- Vendor service requests linked to tickets
IF OBJECT_ID('app.VendorServiceRequests','U') IS NULL
CREATE TABLE app.VendorServiceRequests (
    vsr_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    vendor_id INT NOT NULL,
    request_type NVARCHAR(60) NOT NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'Open',
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(vendor_id) REFERENCES app.Vendors(vendor_id)
);
GO

-- Proc: Create/Update Vendor Service Request
CREATE OR ALTER PROCEDURE app.usp_UpsertVendorServiceRequest
  @payload NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    DECLARE @j NVARCHAR(MAX) = @payload;
    DECLARE @vsr_id BIGINT = TRY_CAST(JSON_VALUE(@j,'$.vsr_id') AS BIGINT);
    DECLARE @ticket_id INT = TRY_CAST(JSON_VALUE(@j,'$.ticket_id') AS INT);
    DECLARE @vendor_id INT = TRY_CAST(JSON_VALUE(@j,'$.vendor_id') AS INT);
    DECLARE @request_type NVARCHAR(60) = JSON_VALUE(@j,'$.request_type');
    DECLARE @status NVARCHAR(40) = COALESCE(JSON_VALUE(@j,'$.status'),'Open');
    DECLARE @notes NVARCHAR(MAX) = JSON_VALUE(@j,'$.notes');

    IF @ticket_id IS NULL OR @vendor_id IS NULL OR @request_type IS NULL
      RAISERROR('ticket_id, vendor_id, request_type required', 16, 1);

    IF @vsr_id IS NULL
    BEGIN
      INSERT INTO app.VendorServiceRequests(ticket_id, vendor_id, request_type, status, notes)
      VALUES(@ticket_id, @vendor_id, @request_type, @status, @notes);
      SET @vsr_id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
      UPDATE app.VendorServiceRequests
        SET request_type = @request_type,
            status = @status,
            notes = @notes,
            updated_at = SYSUTCDATETIME()
      WHERE vsr_id = @vsr_id;
    END

    DECLARE @payloadVsr NVARCHAR(MAX) = (SELECT @ticket_id AS ticket_id, @vsr_id AS vsr_id, @vendor_id AS vendor_id, @request_type AS request_type, @status AS status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    INSERT INTO app.Outbox(aggregate, aggregate_id, type, payload)
    VALUES('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'vendor.service_request', @payloadVsr);
    SELECT @vsr_id AS vsr_id;
  END TRY
  BEGIN CATCH
    INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
    VALUES ('usp_UpsertVendorServiceRequest', CONVERT(NVARCHAR(64), ISNULL(@ticket_id,'')), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
    THROW;
  END CATCH
END
GO

PRINT '18_messaging_and_types.sql applied.';
GO