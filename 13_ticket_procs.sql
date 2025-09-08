-- 13_ticket_procs.sql
-- Atomic create/update ticket proc targeting app.TicketMaster, writes history, assets, and outbox
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE app.usp_CreateOrUpdateTicket_v2
  @payload NVARCHAR(MAX),
  @expected_rowversion VARBINARY(8) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRAN;
  BEGIN TRY
    DECLARE @j NVARCHAR(MAX) = @payload;
    DECLARE @ticket_id INT = TRY_CAST(JSON_VALUE(@j,'$.ticket_id') AS INT);
    DECLARE @site_id INT = TRY_CAST(JSON_VALUE(@j,'$.site_id') AS INT);
    DECLARE @status NVARCHAR(40) = JSON_VALUE(@j,'$.status');
    DECLARE @substatus_code NVARCHAR(60) = JSON_VALUE(@j,'$.substatus_code');
    DECLARE @severity TINYINT = TRY_CAST(JSON_VALUE(@j,'$.severity') AS TINYINT);
    DECLARE @category_id INT = TRY_CAST(JSON_VALUE(@j,'$.category_id') AS INT);
    DECLARE @summary NVARCHAR(512) = JSON_VALUE(@j,'$.summary');
    DECLARE @description NVARCHAR(MAX) = JSON_VALUE(@j,'$.description');
    DECLARE @created_by INT = TRY_CAST(JSON_VALUE(@j,'$.created_by') AS INT);
    DECLARE @assignee_user_id INT = TRY_CAST(JSON_VALUE(@j,'$.assignee_user_id') AS INT);
    DECLARE @team_id INT = TRY_CAST(JSON_VALUE(@j,'$.team_id') AS INT);
    DECLARE @vendor_id INT = TRY_CAST(JSON_VALUE(@j,'$.vendor_id') AS INT);
    DECLARE @due_at DATETIME2(3) = TRY_CAST(JSON_VALUE(@j,'$.due_at') AS DATETIME2(3));
    DECLARE @sla_plan_id INT = TRY_CAST(JSON_VALUE(@j,'$.sla_plan_id') AS INT);
    DECLARE @asset_ids NVARCHAR(MAX) = JSON_QUERY(@j,'$.asset_ids');

    IF @ticket_id IS NULL
    BEGIN
      -- Insert canonical ticket into app.Tickets (system of record)
      INSERT INTO app.Tickets (status, severity, category_id, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id, created_at, updated_at)
      VALUES (@status, ISNULL(@severity,0), @category_id, @summary, @description, @site_id, @created_by, @assignee_user_id, @team_id, @vendor_id, @due_at, @sla_plan_id, SYSUTCDATETIME(), SYSUTCDATETIME());
      SET @ticket_id = SCOPE_IDENTITY();

      -- Insert into TicketMaster
      INSERT INTO app.TicketMaster (ticket_id, ticket_no, external_ref, type_id, category_id, status, substatus_code, priority, severity, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id, created_at, updated_at)
      VALUES (@ticket_id, CONCAT('OG-', FORMAT(@ticket_id,'D7')), NULL, NULL, @category_id, @status, @substatus_code, NULL, @severity, @summary, @description, @site_id, @created_by, @assignee_user_id, @team_id, @vendor_id, @due_at, @sla_plan_id, SYSUTCDATETIME(), SYSUTCDATETIME());
    END
    ELSE
    BEGIN
      -- Update path: enforce optimistic concurrency if expected_rowversion provided
      IF @expected_rowversion IS NOT NULL
      BEGIN
        UPDATE app.TicketMaster
        SET status = @status,
            substatus_code = @substatus_code,
            severity = @severity,
            category_id = @category_id,
            summary = @summary,
            description = @description,
            site_id = @site_id,
            assignee_user_id = @assignee_user_id,
            team_id = @team_id,
            vendor_id = @vendor_id,
            due_at = @due_at,
            sla_plan_id = @sla_plan_id,
            updated_at = SYSUTCDATETIME()
        WHERE ticket_id = @ticket_id AND rowversion = @expected_rowversion;

        IF @@ROWCOUNT = 0
        BEGIN
          ROLLBACK TRAN;
          THROW 51000, 'Rowversion mismatch (concurrency)', 1;
        END
      END
      ELSE
      BEGIN
        UPDATE app.TicketMaster
        SET status = @status,
            substatus_code = @substatus_code,
            severity = @severity,
            category_id = @category_id,
            summary = @summary,
            description = @description,
            site_id = @site_id,
            assignee_user_id = @assignee_user_id,
            team_id = @team_id,
            vendor_id = @vendor_id,
            due_at = @due_at,
            sla_plan_id = @sla_plan_id,
            updated_at = SYSUTCDATETIME()
        WHERE ticket_id = @ticket_id;
      END
    END

    -- Record history
    INSERT INTO app.TicketHistory (ticket_id, change_type, old_value, new_value, changed_by, changed_at, metadata)
    VALUES (@ticket_id, 'upsert', NULL, @payload, @created_by, SYSUTCDATETIME(), @payload);

    -- TicketAssets: sync list (simple approach: delete then insert)
    IF @asset_ids IS NOT NULL
    BEGIN
      DELETE FROM app.TicketAssets WHERE ticket_id = @ticket_id;
      DECLARE @i INT = 0, @n INT = (SELECT COUNT(*) FROM OPENJSON(@asset_ids));
      WHILE @i < @n
      BEGIN
        DECLARE @aid INT = (SELECT value FROM OPENJSON(@asset_ids) WITH (value INT '$') WHERE [key] = CAST(@i AS NVARCHAR));
        INSERT INTO app.TicketAssets (ticket_id, asset_id) VALUES (@ticket_id, @aid);
        SET @i = @i + 1;
      END
    END

    -- Outbox: enqueue event for worker
    INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload) VALUES ('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'ticket.upserted', @payload);

    COMMIT TRAN;

    -- Return created/updated ticket id
    SELECT @ticket_id AS ticket_id;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0
      ROLLBACK TRAN;
    DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
    VALUES ('usp_CreateOrUpdateTicket_v2', CONVERT(NVARCHAR(64), ISNULL(CAST(@ticket_id AS NVARCHAR(64)),'')), @err_msg, ERROR_PROCEDURE(), SYSUTCDATETIME());
    THROW;
  END CATCH
END
GO
