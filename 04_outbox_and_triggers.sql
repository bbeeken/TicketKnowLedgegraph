-- 04_outbox_and_triggers.sql
-- Outbox, IntegrationErrors, triggers, dequeue proc
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Outbox
IF OBJECT_ID('app.Outbox','U') IS NULL
CREATE TABLE app.Outbox (
    event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    aggregate NVARCHAR(40) NOT NULL,
    aggregate_id NVARCHAR(64) NOT NULL,
    type NVARCHAR(60) NOT NULL,
    payload NVARCHAR(MAX) NOT NULL CHECK(ISJSON(payload)=1),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    published BIT NOT NULL DEFAULT 0,
    try_count INT NOT NULL DEFAULT 0
);
GO

-- IntegrationErrors
IF OBJECT_ID('app.IntegrationErrors','U') IS NULL
CREATE TABLE app.IntegrationErrors (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    source NVARCHAR(40) NOT NULL,
    ref_id NVARCHAR(64) NULL,
    message NVARCHAR(400) NOT NULL,
    details NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Outbox Triggers (stubs, to be filled in 07_functions_and_procs.sql)
IF OBJECT_ID('app.tr_Tickets_Outbox','TR') IS NULL
EXEC('CREATE TRIGGER app.tr_Tickets_Outbox ON app.Tickets AFTER INSERT, UPDATE AS BEGIN SET NOCOUNT ON; END');
GO
IF OBJECT_ID('app.tr_Alerts_Outbox','TR') IS NULL
EXEC('CREATE TRIGGER app.tr_Alerts_Outbox ON app.Alerts AFTER INSERT AS BEGIN SET NOCOUNT ON; END');
GO
IF OBJECT_ID('app.tr_Events_Outbox','TR') IS NULL
EXEC('CREATE TRIGGER app.tr_Events_Outbox ON app.Events AFTER INSERT AS BEGIN SET NOCOUNT ON; END');
GO

-- Replace stubs with working triggers
IF OBJECT_ID('app.tr_Tickets_Outbox','TR') IS NOT NULL
    DROP TRIGGER app.tr_Tickets_Outbox;
GO
CREATE TRIGGER app.tr_Tickets_Outbox ON app.Tickets AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
    SELECT 'ticket', CAST(i.ticket_id AS NVARCHAR(64)), 'ticket.created', (SELECT i.ticket_id AS ticket_id, i.status, i.summary, i.site_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END
GO

IF OBJECT_ID('app.tr_Alerts_Outbox','TR') IS NOT NULL
    DROP TRIGGER app.tr_Alerts_Outbox;
GO
CREATE TRIGGER app.tr_Alerts_Outbox ON app.Alerts AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
    SELECT 'alert', CAST(i.alert_id AS NVARCHAR(64)), 'alert.created', (SELECT i.alert_id AS alert_id, i.event_id AS event_id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END
GO

-- Events trigger
IF OBJECT_ID('app.tr_Events_Outbox','TR') IS NOT NULL
    DROP TRIGGER app.tr_Events_Outbox;
GO
CREATE TRIGGER app.tr_Events_Outbox ON app.Events AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
    SELECT 'event', CAST(i.event_id AS NVARCHAR(64)), 'event.created', (SELECT i.event_id AS event_id, i.canonical_code AS code, i.level AS level, i.occurred_at FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END
GO

-- Outbox Dequeue proc
CREATE OR ALTER PROCEDURE app.usp_Outbox_DequeueBatch
    @batch_size INT = 100
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
    WITH cte AS (
        SELECT TOP (@batch_size) event_id
        FROM app.Outbox WITH (UPDLOCK, READPAST)
        WHERE published = 0
        ORDER BY created_at
    )
    UPDATE o
    SET published = 1
    OUTPUT inserted.*
    FROM app.Outbox o
    JOIN cte ON o.event_id = cte.event_id;
    COMMIT TRAN;
END
GO
