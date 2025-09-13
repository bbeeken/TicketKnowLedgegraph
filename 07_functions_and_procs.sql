-- 07_functions_and_procs.sql
-- Core functions and procs for ingest, upsert, mirroring
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Deterministic 26-char EventId from SHA-256
CREATE OR ALTER FUNCTION kg.ufn_EventId(
    @source NVARCHAR(40),
    @when DATETIME2(3),
    @site INT,
    @asset INT,
    @canon_code NVARCHAR(60)
) RETURNS CHAR(26)
AS
BEGIN
    DECLARE @hash VARBINARY(32) = HASHBYTES('SHA2_256', CONCAT(@source, '|', FORMAT(@when, 'yyyy-MM-ddTHH:mm:ss.fffZ'), '|', @site, '|', @asset, '|', @canon_code));
    RETURN CAST(CONVERT(BIGINT, SUBSTRING(@hash,1,8)) AS VARCHAR) + RIGHT(CONVERT(VARCHAR(20), ABS(CHECKSUM(@hash))), 18);
END
GO

-- Upsert Event from Vendor JSON
CREATE OR ALTER PROCEDURE app.usp_UpsertEventFromVendor
    @payload NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @j NVARCHAR(MAX) = @payload;
        DECLARE @source NVARCHAR(40) = JSON_VALUE(@j, '$.source');
        DECLARE @occurred_at DATETIME2(3) = JSON_VALUE(@j, '$.occurred_at');
        DECLARE @site_id INT = JSON_VALUE(@j, '$.site_id');
        DECLARE @asset_id INT = JSON_VALUE(@j, '$.asset_id');
        DECLARE @vendor_code NVARCHAR(120) = JSON_VALUE(@j, '$.code');
        DECLARE @message NVARCHAR(MAX) = JSON_VALUE(@j, '$.message');
        DECLARE @canonical_code NVARCHAR(60), @canonical_level NVARCHAR(20);
        SELECT @canonical_code = canonical_code, @canonical_level = canonical_level
        FROM app.CodeMap WHERE source=@source AND vendor_code=@vendor_code;
        IF @canonical_code IS NULL
            THROW 50001, 'Unknown code mapping', 1;
        DECLARE @event_id CHAR(26) = kg.ufn_EventId(@source, @occurred_at, @site_id, @asset_id, @canonical_code);
        -- Upsert app.Events
        MERGE app.Events AS tgt
        USING (SELECT @event_id event_id) AS src
        ON tgt.event_id = src.event_id
        WHEN MATCHED THEN
            UPDATE SET message=@message, occurred_at=@occurred_at, created_at=SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
            INSERT (event_id, site_id, asset_id, source, vendor_code, canonical_code, level, message, occurred_at, created_at)
            VALUES (@event_id, @site_id, @asset_id, @source, @vendor_code, @canonical_code, @canonical_level, @message, @occurred_at, SYSUTCDATETIME());
    -- Upsert app.Alerts if major/critical
        IF @canonical_level IN ('major','critical')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM app.Alerts WHERE event_id=@event_id)
        INSERT INTO app.Alerts (alert_id, event_id, [rule], priority, raised_at)
        VALUES (@event_id, @event_id, N'level>=major', CASE WHEN @canonical_level='critical' THEN 80 ELSE 70 END, @occurred_at);
        END
        -- Mirror to kg.Event, kg.Alert, edges
        IF NOT EXISTS (SELECT 1 FROM kg.Event WHERE event_id=@event_id)
            INSERT INTO kg.Event (event_id, occurred_at, source, code, level, message)
            VALUES (@event_id, @occurred_at, @source, @canonical_code, @canonical_level, LEFT(@message,4000));
    IF @canonical_level IN ('major','critical')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM kg.Alert WHERE alert_id=@event_id)
        INSERT INTO kg.Alert (alert_id, raised_at, rule_name, priority)
        VALUES (@event_id, @occurred_at, N'level>=major', CASE WHEN @canonical_level='critical' THEN 80 ELSE 70 END);
            IF NOT EXISTS (SELECT 1 FROM kg.PROMOTED_TO WHERE $from_id = (SELECT $node_id FROM kg.Event WHERE event_id=@event_id) AND $to_id = (SELECT $node_id FROM kg.Alert WHERE alert_id=@event_id))
                INSERT INTO kg.PROMOTED_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Event WHERE event_id=@event_id), (SELECT $node_id FROM kg.Alert WHERE alert_id=@event_id));
        END
        IF NOT EXISTS (SELECT 1 FROM kg.LOCATED_AT WHERE $from_id = (SELECT $node_id FROM kg.Event WHERE event_id=@event_id) AND $to_id = (SELECT $node_id FROM kg.Site WHERE site_id=@site_id))
            INSERT INTO kg.LOCATED_AT ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Event WHERE event_id=@event_id), (SELECT $node_id FROM kg.Site WHERE site_id=@site_id));
        IF NOT EXISTS (SELECT 1 FROM kg.ON_ASSET WHERE $from_id = (SELECT $node_id FROM kg.Event WHERE event_id=@event_id) AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id))
            INSERT INTO kg.ON_ASSET ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Event WHERE event_id=@event_id), (SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id));
        -- Outbox
        INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload) VALUES ('event', @event_id, 'event.created', @payload);
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_UpsertEventFromVendor', NULL, ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Upsert/CreateOrUpdate Ticket
CREATE OR ALTER PROCEDURE app.usp_CreateOrUpdateTicket
    @payload NVARCHAR(MAX),
    @expected_rowversion BINARY(8) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @j NVARCHAR(MAX) = @payload;
        DECLARE @ticket_id INT = JSON_VALUE(@j, '$.ticket_id');
        DECLARE @site_id INT = JSON_VALUE(@j, '$.site_id');
        DECLARE @summary NVARCHAR(240) = JSON_VALUE(@j, '$.summary');
        DECLARE @status NVARCHAR(30) = JSON_VALUE(@j, '$.status');
        DECLARE @severity TINYINT = JSON_VALUE(@j, '$.severity');
        DECLARE @category_id INT = JSON_VALUE(@j, '$.category_id');
        DECLARE @description NVARCHAR(MAX) = JSON_VALUE(@j, '$.description');
        DECLARE @created_by INT = JSON_VALUE(@j, '$.created_by');
        DECLARE @assignee_user_id INT = JSON_VALUE(@j, '$.assignee_user_id');
        DECLARE @team_id INT = JSON_VALUE(@j, '$.team_id');
        DECLARE @vendor_id INT = JSON_VALUE(@j, '$.vendor_id');
        DECLARE @due_at DATETIME2(3) = JSON_VALUE(@j, '$.due_at');
        DECLARE @sla_plan_id INT = JSON_VALUE(@j, '$.sla_plan_id');
        DECLARE @asset_ids NVARCHAR(MAX) = JSON_QUERY(@j, '$.asset_ids');
        DECLARE @rowversion BINARY(8);
        IF @ticket_id IS NULL
        BEGIN
            INSERT INTO app.Tickets (status, severity, category_id, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id)
            VALUES (@status, @severity, @category_id, @summary, @description, @site_id, @created_by, @assignee_user_id, @team_id, @vendor_id, @due_at, @sla_plan_id);
            SET @ticket_id = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            IF @expected_rowversion IS NOT NULL
                UPDATE app.Tickets SET status=@status, severity=@severity, category_id=@category_id, summary=@summary, description=@description, site_id=@site_id, assignee_user_id=@assignee_user_id, team_id=@team_id, vendor_id=@vendor_id, due_at=@due_at, sla_plan_id=@sla_plan_id
                WHERE ticket_id=@ticket_id AND rowversion=@expected_rowversion;
            ELSE
                UPDATE app.Tickets SET status=@status, severity=@severity, category_id=@category_id, summary=@summary, description=@description, site_id=@site_id, assignee_user_id=@assignee_user_id, team_id=@team_id, vendor_id=@vendor_id, due_at=@due_at, sla_plan_id=@sla_plan_id
                WHERE ticket_id=@ticket_id;
        END
        -- Status history (use current status as old_status for initial create to satisfy NOT NULL)
        INSERT INTO app.TicketStatusHistory (ticket_id, old_status, new_status, changed_by, note)
        VALUES (
            @ticket_id,
            ISNULL((SELECT TOP 1 status FROM app.Tickets WHERE ticket_id=@ticket_id), @status),
            @status,
            @created_by,
            NULL
        );
        -- Upsert TicketAssets
        IF @asset_ids IS NOT NULL
        BEGIN
            DECLARE @i INT = 0, @n INT = (SELECT COUNT(*) FROM OPENJSON(@asset_ids));
            WHILE @i < @n
            BEGIN
                DECLARE @aid INT = (SELECT CAST([value] AS INT) FROM OPENJSON(@asset_ids) WHERE [key]=CAST(@i AS NVARCHAR(10)));
                IF @aid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.TicketAssets WHERE ticket_id=@ticket_id AND asset_id=@aid)
                    INSERT INTO app.TicketAssets (ticket_id, asset_id) VALUES (@ticket_id, @aid);
                SET @i = @i + 1;
            END
        END
        -- Mirror to kg.Ticket
        IF NOT EXISTS (SELECT 1 FROM kg.Ticket WHERE ticket_id=@ticket_id)
            INSERT INTO kg.Ticket (ticket_id, status, created_at, severity, category, summary)
            SELECT ticket_id, status, created_at, severity, (SELECT name FROM app.Categories WHERE category_id=app.Tickets.category_id), summary FROM app.Tickets WHERE ticket_id=@ticket_id;
        -- Add kg.CREATED_TICKET and kg.RELATES_TO
    IF @asset_ids IS NOT NULL
        BEGIN
            DECLARE @i2 INT = 0, @n2 INT = (SELECT COUNT(*) FROM OPENJSON(@asset_ids));
            WHILE @i2 < @n2
            BEGIN
        DECLARE @aid2 INT = (SELECT CAST([value] AS INT) FROM OPENJSON(@asset_ids) WHERE [key]=CAST(@i2 AS NVARCHAR(10)));
                IF NOT EXISTS (SELECT 1 FROM kg.RELATES_TO WHERE $from_id = (SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id) AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=@aid2))
                    INSERT INTO kg.RELATES_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id), (SELECT $node_id FROM kg.Asset WHERE asset_id=@aid2));
                SET @i2 = @i2 + 1;
            END
        END
        -- Outbox
        INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload) VALUES ('ticket', @ticket_id, 'ticket.created', @payload);
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_CreateOrUpdateTicket', NULL, ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Promote Event to Alert
CREATE OR ALTER PROCEDURE kg.usp_PromoteEventToAlert
    @event_id CHAR(26),
    @rule NVARCHAR(120),
    @priority INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM app.Alerts WHERE event_id=@event_id)
            INSERT INTO app.Alerts (alert_id, event_id, [rule], priority, raised_at)
            SELECT @event_id, @event_id, @rule, @priority, occurred_at FROM app.Events WHERE event_id=@event_id;
        IF NOT EXISTS (SELECT 1 FROM kg.Alert WHERE alert_id=@event_id)
            INSERT INTO kg.Alert (alert_id, raised_at, rule_name, priority)
            SELECT @event_id, occurred_at, @rule, @priority FROM app.Events WHERE event_id=@event_id;
        IF NOT EXISTS (SELECT 1 FROM kg.PROMOTED_TO WHERE $from_id = (SELECT $node_id FROM kg.Event WHERE event_id=@event_id) AND $to_id = (SELECT $node_id FROM kg.Alert WHERE alert_id=@event_id))
            INSERT INTO kg.PROMOTED_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Event WHERE event_id=@event_id), (SELECT $node_id FROM kg.Alert WHERE alert_id=@event_id));
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_PromoteEventToAlert', @event_id, ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Trigger: update Tickets.updated_at on UPDATE
IF OBJECT_ID('app.tr_Tickets_UpdateTimestamp','TR') IS NOT NULL
    DROP TRIGGER app.tr_Tickets_UpdateTimestamp;
GO
CREATE TRIGGER app.tr_Tickets_UpdateTimestamp ON app.Tickets
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE t SET updated_at = SYSUTCDATETIME()
    FROM app.Tickets t
    INNER JOIN inserted i ON t.ticket_id = i.ticket_id;
END
GO
