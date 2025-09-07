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
