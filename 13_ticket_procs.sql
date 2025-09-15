-- 13_ticket_procs.sql
-- Atomic create/update ticket proc targeting app.Tickets (system of record), writes history, assets, and outbox
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
  DECLARE @type_id INT = TRY_CAST(JSON_VALUE(@j,'$.type_id') AS INT);
    DECLARE @due_at DATETIME2(3) = TRY_CAST(JSON_VALUE(@j,'$.due_at') AS DATETIME2(3));
    DECLARE @sla_plan_id INT = TRY_CAST(JSON_VALUE(@j,'$.sla_plan_id') AS INT);
    DECLARE @asset_ids NVARCHAR(MAX) = JSON_QUERY(@j,'$.asset_ids');

    IF @ticket_id IS NULL
    BEGIN
      -- Insert canonical ticket into app.Tickets (system of record)
      INSERT INTO app.Tickets (
        status, severity, category_id, summary, description,
        site_id, created_by, assignee_user_id, team_id, vendor_id,
        due_at, sla_plan_id, created_at, updated_at, substatus_code
      )
      VALUES (
        @status, ISNULL(@severity,0), @category_id, @summary, @description,
        @site_id, @created_by, @assignee_user_id, @team_id, @vendor_id,
        @due_at, @sla_plan_id, SYSUTCDATETIME(), SYSUTCDATETIME(), @substatus_code
      );
      SET @ticket_id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
      -- Update path: enforce optimistic concurrency if expected_rowversion provided (check Tickets rowversion)
      IF @expected_rowversion IS NOT NULL
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM app.Tickets WHERE ticket_id=@ticket_id AND rowversion=@expected_rowversion)
        BEGIN
          ROLLBACK TRAN;
          THROW 51000, 'Rowversion mismatch (concurrency)', 1;
        END
      END

      UPDATE app.Tickets
        SET status = @status,
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
            substatus_code = @substatus_code,
            updated_at = SYSUTCDATETIME()
      WHERE ticket_id = @ticket_id;
    END

    -- Record history if history table exists
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name='TicketHistory' AND schema_id = SCHEMA_ID('app'))
    BEGIN
      BEGIN TRY
        INSERT INTO app.TicketHistory (ticket_id, change_type, old_value, new_value, changed_by, changed_at, metadata)
        VALUES (@ticket_id, 'upsert', NULL, @payload, @created_by, SYSUTCDATETIME(), @payload);
      END TRY
      BEGIN CATCH
        -- Ignore FK errors (547) during bootstrap so ticket creation still succeeds
        IF ERROR_NUMBER() <> 547 THROW;
      END CATCH
    END

    -- TicketAssets: sync list (simple approach: delete then insert set-based)
    IF @asset_ids IS NOT NULL
    BEGIN
      DELETE FROM app.TicketAssets WHERE ticket_id = @ticket_id;
      INSERT INTO app.TicketAssets (ticket_id, asset_id)
      SELECT @ticket_id, TRY_CAST([value] AS INT)
      FROM OPENJSON(@asset_ids);
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

-- Upsert Vendor (basic + optional contact/contract)
CREATE OR ALTER PROCEDURE app.usp_UpsertVendor
  @payload NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    DECLARE @j NVARCHAR(MAX) = @payload;
    DECLARE @vendor_id INT = TRY_CAST(JSON_VALUE(@j,'$.vendor_id') AS INT);
    DECLARE @name NVARCHAR(80) = JSON_VALUE(@j,'$.name');
    DECLARE @contact_email NVARCHAR(120) = JSON_VALUE(@j,'$.contact_email');
    DECLARE @phone NVARCHAR(40) = JSON_VALUE(@j,'$.phone');

    IF @vendor_id IS NULL
    BEGIN
      IF EXISTS (SELECT 1 FROM app.Vendors WHERE name=@name)
        SELECT @vendor_id = vendor_id FROM app.Vendors WHERE name=@name;
      ELSE
      BEGIN
        INSERT INTO app.Vendors(name, contact_email, phone) VALUES(@name, @contact_email, @phone);
        SET @vendor_id = SCOPE_IDENTITY();
      END
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM app.Vendors WHERE vendor_id=@vendor_id)
      BEGIN
        INSERT INTO app.Vendors(vendor_id, name, contact_email, phone) VALUES(@vendor_id, @name, @contact_email, @phone);
      END
      ELSE
      BEGIN
        UPDATE app.Vendors SET name=@name, contact_email=@contact_email, phone=@phone WHERE vendor_id=@vendor_id;
      END
    END

    -- Optional contact
    DECLARE @contact NVARCHAR(MAX) = JSON_QUERY(@j,'$.contact');
    IF @contact IS NOT NULL AND EXISTS (SELECT 1 FROM sys.tables WHERE name='VendorContacts' AND schema_id = SCHEMA_ID('app'))
    BEGIN
      INSERT INTO app.VendorContacts(vendor_id, name, email, phone, role)
      SELECT @vendor_id,
             JSON_VALUE(@contact,'$.name'),
             JSON_VALUE(@contact,'$.email'),
             JSON_VALUE(@contact,'$.phone'),
             JSON_VALUE(@contact,'$.role');
    END

    -- Optional contract
    DECLARE @contract NVARCHAR(MAX) = JSON_QUERY(@j,'$.contract');
    IF @contract IS NOT NULL AND EXISTS (SELECT 1 FROM sys.tables WHERE name='VendorContracts' AND schema_id = SCHEMA_ID('app'))
    BEGIN
      INSERT INTO app.VendorContracts(vendor_id, name, start_date, end_date, notes)
      SELECT @vendor_id,
             JSON_VALUE(@contract,'$.name'),
             TRY_CAST(JSON_VALUE(@contract,'$.start_date') AS DATETIME2(3)),
             TRY_CAST(JSON_VALUE(@contract,'$.end_date') AS DATETIME2(3)),
             JSON_VALUE(@contract,'$.notes');
    END

    SELECT @vendor_id AS vendor_id;
  END TRY
  BEGIN CATCH
    INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
    VALUES ('usp_UpsertVendor', NULL, ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
    THROW;
  END CATCH
END
GO

-- Assign Ticket to user/team
CREATE OR ALTER PROCEDURE app.usp_AssignTicket
  @payload NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRAN;
    DECLARE @j NVARCHAR(MAX) = @payload;
    DECLARE @ticket_id INT = TRY_CAST(JSON_VALUE(@j,'$.ticket_id') AS INT);
    DECLARE @user_id INT = TRY_CAST(JSON_VALUE(@j,'$.user_id') AS INT);
    DECLARE @team_id INT = TRY_CAST(JSON_VALUE(@j,'$.team_id') AS INT);
    DECLARE @assigned_by INT = TRY_CAST(JSON_VALUE(@j,'$.assigned_by') AS INT);

    IF @ticket_id IS NULL OR (@user_id IS NULL AND @team_id IS NULL)
    BEGIN
      -- Parameter validation failure
      RAISERROR('ticket_id and (user_id or team_id) required', 16, 1);
      ROLLBACK TRAN;
      RETURN;
    END

    INSERT INTO app.TicketAssignments(ticket_id, user_id, team_id, assigned_by)
    VALUES(@ticket_id, @user_id, @team_id, @assigned_by);

    -- Update system of record only
    UPDATE app.Tickets
      SET assignee_user_id = @user_id,
          team_id = @team_id,
          updated_at = SYSUTCDATETIME()
      WHERE ticket_id = @ticket_id;

    INSERT INTO app.TicketHistory(ticket_id, change_type, old_value, new_value, changed_by, metadata)
    VALUES(@ticket_id, 'assignment', NULL, NULL, @assigned_by, @payload);

    INSERT INTO app.Outbox(aggregate, aggregate_id, type, payload)
    VALUES('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'ticket.assigned', @payload);

  COMMIT TRAN;
    SELECT @ticket_id AS ticket_id;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRAN;
    INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
    VALUES ('usp_AssignTicket', NULL, ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
    THROW;
  END CATCH
END
GO
