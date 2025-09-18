-- 31_vendor_service_requests.sql
-- Extended vendor service request persistence: history, queries, status update
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- History table for Vendor Service Requests
IF OBJECT_ID('app.VendorServiceRequestHistory','U') IS NULL
CREATE TABLE app.VendorServiceRequestHistory (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    vsr_id BIGINT NOT NULL,
    ticket_id INT NOT NULL,
    vendor_id INT NOT NULL,
    change_type NVARCHAR(40) NOT NULL, -- created, updated, status_change, notes_change
    old_status NVARCHAR(40) NULL,
    new_status NVARCHAR(40) NULL,
    old_notes NVARCHAR(MAX) NULL,
    new_notes NVARCHAR(MAX) NULL,
    changed_by INT NULL, -- user id if available
    changed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    metadata NVARCHAR(MAX) NULL,
    FOREIGN KEY(vsr_id) REFERENCES app.VendorServiceRequests(vsr_id)
);
GO

-- Add helper indexes if not exist
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VSR_Ticket' AND object_id=OBJECT_ID('app.VendorServiceRequests'))
    CREATE INDEX IX_VSR_Ticket ON app.VendorServiceRequests(ticket_id, status) INCLUDE(updated_at, vendor_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VSR_Vendor' AND object_id=OBJECT_ID('app.VendorServiceRequests'))
    CREATE INDEX IX_VSR_Vendor ON app.VendorServiceRequests(vendor_id, status) INCLUDE(updated_at, ticket_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VSRH_Vsr' AND object_id=OBJECT_ID('app.VendorServiceRequestHistory'))
    CREATE INDEX IX_VSRH_Vsr ON app.VendorServiceRequestHistory(vsr_id, changed_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VSRH_Ticket' AND object_id=OBJECT_ID('app.VendorServiceRequestHistory'))
    CREATE INDEX IX_VSRH_Ticket ON app.VendorServiceRequestHistory(ticket_id, changed_at DESC);
GO

-- Proc: List Vendor Service Requests for a ticket
CREATE OR ALTER PROCEDURE app.usp_ListVendorServiceRequests
    @ticket_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT vsr_id, ticket_id, vendor_id, request_type, status, notes, created_at, updated_at
    FROM app.VendorServiceRequests
    WHERE ticket_id = @ticket_id
    ORDER BY created_at ASC;
END
GO

-- Proc: Get single Vendor Service Request
CREATE OR ALTER PROCEDURE app.usp_GetVendorServiceRequest
    @vsr_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT vsr_id, ticket_id, vendor_id, request_type, status, notes, created_at, updated_at
    FROM app.VendorServiceRequests
    WHERE vsr_id = @vsr_id;
END
GO

-- Proc: History for a Vendor Service Request
CREATE OR ALTER PROCEDURE app.usp_GetVendorServiceRequestHistory
    @vsr_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT history_id, vsr_id, ticket_id, vendor_id, change_type, old_status, new_status, old_notes, new_notes, changed_by, changed_at, metadata
    FROM app.VendorServiceRequestHistory
    WHERE vsr_id = @vsr_id
    ORDER BY history_id ASC;
END
GO

-- Proc: Update status (with history capture)
CREATE OR ALTER PROCEDURE app.usp_UpdateVendorServiceRequestStatus
    @vsr_id BIGINT,
    @new_status NVARCHAR(40),
    @user_id INT = NULL,
    @notes NVARCHAR(MAX) = NULL -- optional notes append/replace
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @old_status NVARCHAR(40);
        DECLARE @old_notes NVARCHAR(MAX);
        DECLARE @ticket_id INT; DECLARE @vendor_id INT;
        SELECT @old_status = status, @old_notes = notes, @ticket_id = ticket_id, @vendor_id = vendor_id
        FROM app.VendorServiceRequests WHERE vsr_id=@vsr_id;
        IF @old_status IS NULL RAISERROR('Invalid vsr_id',16,1);

        UPDATE app.VendorServiceRequests
            SET status = @new_status,
                notes = COALESCE(@notes, notes),
                updated_at = SYSUTCDATETIME()
        WHERE vsr_id = @vsr_id;

        INSERT INTO app.VendorServiceRequestHistory(vsr_id, ticket_id, vendor_id, change_type, old_status, new_status, old_notes, new_notes, changed_by, metadata)
        VALUES(@vsr_id, @ticket_id, @vendor_id, 'status_change', @old_status, @new_status, @old_notes, COALESCE(@notes,@old_notes), @user_id, NULL);

        DECLARE @payload NVARCHAR(MAX) = (SELECT @ticket_id AS ticket_id, @vsr_id AS vsr_id, @new_status AS status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        INSERT INTO app.Outbox(aggregate, aggregate_id, type, payload)
        VALUES('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'vendor.service_request.status', @payload);
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_UpdateVendorServiceRequestStatus', CONVERT(NVARCHAR(64), ISNULL(@vsr_id,'')), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Augment existing upsert proc to capture history (non-destructive pattern)
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
    DECLARE @user_id INT = TRY_CAST(JSON_VALUE(@j,'$.user_id') AS INT);

    IF @ticket_id IS NULL OR @vendor_id IS NULL OR @request_type IS NULL
      RAISERROR('ticket_id, vendor_id, request_type required', 16, 1);

    DECLARE @is_insert BIT = CASE WHEN @vsr_id IS NULL THEN 1 ELSE 0 END;
    DECLARE @old_status NVARCHAR(40); DECLARE @old_notes NVARCHAR(MAX);
    IF @is_insert = 0
        SELECT @old_status = status, @old_notes = notes FROM app.VendorServiceRequests WHERE vsr_id=@vsr_id;

    IF @vsr_id IS NULL
    BEGIN
      INSERT INTO app.VendorServiceRequests(ticket_id, vendor_id, request_type, status, notes)
      VALUES(@ticket_id, @vendor_id, @request_type, @status, @notes);
      SET @vsr_id = SCOPE_IDENTITY();
      INSERT INTO app.VendorServiceRequestHistory(vsr_id, ticket_id, vendor_id, change_type, new_status, new_notes, changed_by)
      VALUES(@vsr_id, @ticket_id, @vendor_id, 'created', @status, @notes, @user_id);
    END
    ELSE
    BEGIN
      UPDATE app.VendorServiceRequests
        SET request_type = @request_type,
            status = @status,
            notes = @notes,
            updated_at = SYSUTCDATETIME()
      WHERE vsr_id = @vsr_id;
      INSERT INTO app.VendorServiceRequestHistory(vsr_id, ticket_id, vendor_id, change_type, old_status, new_status, old_notes, new_notes, changed_by)
      VALUES(@vsr_id, @ticket_id, @vendor_id, 'updated', @old_status, @status, @old_notes, @notes, @user_id);
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

PRINT '31_vendor_service_requests.sql applied.';
GO