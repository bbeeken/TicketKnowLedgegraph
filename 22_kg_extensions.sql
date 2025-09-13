-- 22_kg_extensions.sql
-- Extended Knowledge Graph for invoices, billing, documents, remote sessions, external files, knowledge snippets
USE [OpsGraph];
GO
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; GO

/* New Nodes */
IF OBJECT_ID('kg.Vendor','U') IS NULL
CREATE TABLE kg.Vendor (
  vendor_id INT PRIMARY KEY,
  name NVARCHAR(160) NOT NULL,
  category NVARCHAR(80) NULL,
  active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
) AS NODE;
GO

IF OBJECT_ID('kg.Team','U') IS NULL
CREATE TABLE kg.Team (
  team_id INT PRIMARY KEY,
  name NVARCHAR(120) NOT NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
) AS NODE; 
GO

IF OBJECT_ID('kg.UserProfile','U') IS NULL
CREATE TABLE kg.UserProfile (
  user_id INT PRIMARY KEY,
  name NVARCHAR(120) NOT NULL,
  role NVARCHAR(60) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
) AS NODE; 
GO

IF OBJECT_ID('kg.Document','U') IS NULL
CREATE TABLE kg.Document (
  document_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  source_system NVARCHAR(60) NOT NULL,
  external_key NVARCHAR(200) NOT NULL,
  title NVARCHAR(240) NOT NULL,
  mime_type NVARCHAR(100) NULL,
  summary NVARCHAR(1000) NULL,
  hash NVARCHAR(128) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  UNIQUE(source_system, external_key)
) AS NODE; 
GO

IF OBJECT_ID('kg.Invoice','U') IS NULL
CREATE TABLE kg.Invoice (
  invoice_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  vendor_id INT NULL,
  invoice_number NVARCHAR(80) NOT NULL,
  invoice_date DATE NOT NULL,
  total_amount DECIMAL(18,2) NULL,
  currency CHAR(3) NULL,
  status NVARCHAR(40) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  UNIQUE(invoice_number)
) AS NODE; 
GO

IF OBJECT_ID('kg.BillingEvent','U') IS NULL
CREATE TABLE kg.BillingEvent (
  billing_event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  event_type NVARCHAR(60) NOT NULL,
  amount DECIMAL(18,2) NULL,
  occurred_at DATETIME2(3) NOT NULL,
  notes NVARCHAR(400) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
) AS NODE; 
GO

IF OBJECT_ID('kg.RemoteSession','U') IS NULL
CREATE TABLE kg.RemoteSession (
  remote_session_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  provider NVARCHAR(40) NOT NULL, -- TeamViewer / etc.
  session_code NVARCHAR(120) NOT NULL,
  started_at DATETIME2(3) NOT NULL,
  ended_at DATETIME2(3) NULL,
  technician NVARCHAR(120) NULL,
  outcome NVARCHAR(200) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  UNIQUE(provider, session_code)
) AS NODE; 
GO

IF OBJECT_ID('kg.ExternalFile','U') IS NULL
CREATE TABLE kg.ExternalFile (
  external_file_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  system NVARCHAR(60) NOT NULL, -- Laserfiche, SharePoint, etc.
  external_path NVARCHAR(400) NOT NULL,
  title NVARCHAR(240) NULL,
  file_type NVARCHAR(40) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  UNIQUE(system, external_path)
) AS NODE;
GO

IF OBJECT_ID('kg.KnowledgeSnippet','U') IS NULL
CREATE TABLE kg.KnowledgeSnippet (
  snippet_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  source NVARCHAR(60) NOT NULL, -- derived, manual, ai
  label NVARCHAR(200) NULL,
  content NVARCHAR(MAX) NOT NULL,
  embedding VARBINARY(MAX) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
) AS NODE;
GO

/* New Edges */
IF OBJECT_ID('kg.VENDOR_FOR','U') IS NULL CREATE TABLE kg.VENDOR_FOR AS EDGE; GO
IF OBJECT_ID('kg.SUPPORTS','U') IS NULL CREATE TABLE kg.SUPPORTS AS EDGE; GO
IF OBJECT_ID('kg.ASSIGNED_TO','U') IS NULL CREATE TABLE kg.ASSIGNED_TO AS EDGE; GO
IF OBJECT_ID('kg.INVOICE_FOR','U') IS NULL CREATE TABLE kg.INVOICE_FOR AS EDGE; GO
IF OBJECT_ID('kg.CHARGES_FOR','U') IS NULL CREATE TABLE kg.CHARGES_FOR AS EDGE; GO
IF OBJECT_ID('kg.DOCUMENT_FOR','U') IS NULL CREATE TABLE kg.DOCUMENT_FOR AS EDGE; GO
IF OBJECT_ID('kg.ATTACHED_FILE','U') IS NULL CREATE TABLE kg.ATTACHED_FILE AS EDGE; GO
IF OBJECT_ID('kg.SESSION_FOR','U') IS NULL CREATE TABLE kg.SESSION_FOR AS EDGE; GO
IF OBJECT_ID('kg.SNIPPET_REF','U') IS NULL CREATE TABLE kg.SNIPPET_REF AS EDGE; GO
IF OBJECT_ID('kg.DERIVED_FROM','U') IS NULL CREATE TABLE kg.DERIVED_FROM AS EDGE; GO
IF OBJECT_ID('kg.RELATES_VENDOR','U') IS NULL CREATE TABLE kg.RELATES_VENDOR AS EDGE; GO
IF OBJECT_ID('kg.RELATES_INVOICE','U') IS NULL CREATE TABLE kg.RELATES_INVOICE AS EDGE; GO
IF OBJECT_ID('kg.RELATES_FILE','U') IS NULL CREATE TABLE kg.RELATES_FILE AS EDGE; GO

/* Indexes (idempotent) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_Document_source_key' AND object_id=OBJECT_ID('kg.Document'))
  CREATE UNIQUE NONCLUSTERED INDEX IX_kg_Document_source_key ON kg.Document(source_system, external_key);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_Invoice_number' AND object_id=OBJECT_ID('kg.Invoice'))
  CREATE UNIQUE NONCLUSTERED INDEX IX_kg_Invoice_number ON kg.Invoice(invoice_number);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_RemoteSession_provider_code' AND object_id=OBJECT_ID('kg.RemoteSession'))
  CREATE UNIQUE NONCLUSTERED INDEX IX_kg_RemoteSession_provider_code ON kg.RemoteSession(provider, session_code);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_ExternalFile_system_path' AND object_id=OBJECT_ID('kg.ExternalFile'))
  CREATE UNIQUE NONCLUSTERED INDEX IX_kg_ExternalFile_system_path ON kg.ExternalFile(system, external_path);
GO

/* Edge composite indexes to accelerate pattern matches */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_DOCUMENT_FOR_from_to' AND object_id=OBJECT_ID('kg.DOCUMENT_FOR'))
  CREATE NONCLUSTERED INDEX IX_kg_DOCUMENT_FOR_from_to ON kg.DOCUMENT_FOR($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_RELATES_FILE_from_to' AND object_id=OBJECT_ID('kg.RELATES_FILE'))
  CREATE NONCLUSTERED INDEX IX_kg_RELATES_FILE_from_to ON kg.RELATES_FILE($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_RELATES_INVOICE_from_to' AND object_id=OBJECT_ID('kg.RELATES_INVOICE'))
  CREATE NONCLUSTERED INDEX IX_kg_RELATES_INVOICE_from_to ON kg.RELATES_INVOICE($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_SESSION_FOR_from_to' AND object_id=OBJECT_ID('kg.SESSION_FOR'))
  CREATE NONCLUSTERED INDEX IX_kg_SESSION_FOR_from_to ON kg.SESSION_FOR($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_SNIPPET_REF_from_to' AND object_id=OBJECT_ID('kg.SNIPPET_REF'))
  CREATE NONCLUSTERED INDEX IX_kg_SNIPPET_REF_from_to ON kg.SNIPPET_REF($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_DERIVED_FROM_from_to' AND object_id=OBJECT_ID('kg.DERIVED_FROM'))
  CREATE NONCLUSTERED INDEX IX_kg_DERIVED_FROM_from_to ON kg.DERIVED_FROM($from_id, $to_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_kg_RELATES_VENDOR_from_to' AND object_id=OBJECT_ID('kg.RELATES_VENDOR'))
  CREATE NONCLUSTERED INDEX IX_kg_RELATES_VENDOR_from_to ON kg.RELATES_VENDOR($from_id, $to_id);
GO

/* Helper inline table-valued function to get ticket context */
CREATE OR ALTER VIEW kg.vw_TicketKnowledgeContext AS
SELECT 
  t.ticket_id,
  t.summary,
  t.status,
  t.category,
  t.severity,
  -- Assets JSON
  (SELECT a.asset_id, a.type, a.model, a.vendor
   FROM kg.RELATES_TO rt
   JOIN kg.Asset a ON rt.$to_id = a.$node_id
   WHERE rt.$from_id = kgt.$node_id
   FOR JSON PATH) AS assets_json,
  -- Vendors JSON (ticket direct + asset vendors)
  (SELECT DISTINCT v.vendor_id, v.name, v.category
   FROM kg.RELATES_VENDOR rv
     JOIN kg.Vendor v ON rv.$to_id = v.$node_id
   WHERE rv.$from_id = kgt.$node_id
   FOR JSON PATH) AS vendors_json,
  -- Invoices JSON
  (SELECT i.invoice_id, i.invoice_number, i.invoice_date, i.total_amount, i.status
   FROM kg.RELATES_INVOICE ri
     JOIN kg.Invoice i ON ri.$to_id = i.$node_id
   WHERE ri.$from_id = kgt.$node_id
   FOR JSON PATH) AS invoices_json,
  -- Documents JSON
  (SELECT d.document_id, d.title, d.source_system, d.external_key
   FROM kg.DOCUMENT_FOR df
     JOIN kg.Document d ON df.$from_id = d.$node_id
   WHERE df.$to_id = kgt.$node_id
   FOR JSON PATH) AS documents_json,
  -- External files JSON
  (SELECT ef.external_file_id, ef.system, ef.external_path, ef.title
   FROM kg.RELATES_FILE rf
     JOIN kg.ExternalFile ef ON rf.$to_id = ef.$node_id
   WHERE rf.$from_id = kgt.$node_id
   FOR JSON PATH) AS external_files_json,
  -- Remote sessions JSON
  (SELECT rs.remote_session_id, rs.provider, rs.session_code, rs.started_at, rs.ended_at, rs.technician, rs.outcome
   FROM kg.SESSION_FOR sf
     JOIN kg.RemoteSession rs ON sf.$from_id = rs.$node_id
   WHERE sf.$to_id = kgt.$node_id
   FOR JSON PATH) AS remote_sessions_json,
  -- Knowledge Snippets JSON
  (SELECT ks.snippet_id, ks.source, ks.label
   FROM kg.SNIPPET_REF r
     JOIN kg.KnowledgeSnippet ks ON r.$from_id = ks.$node_id
   WHERE r.$to_id = kgt.$node_id
   FOR JSON PATH) AS snippets_json
FROM kg.Ticket t
JOIN kg.Ticket kgt ON kgt.ticket_id = t.ticket_id;
GO

/* Upsert Procedures */
-- Document
CREATE OR ALTER PROCEDURE kg.usp_UpsertDocumentAndLink
  @source_system NVARCHAR(60),
  @external_key NVARCHAR(200),
  @title NVARCHAR(240),
  @mime_type NVARCHAR(100) = NULL,
  @summary NVARCHAR(1000) = NULL,
  @hash NVARCHAR(128) = NULL,
  @ticket_id INT = NULL,
  @asset_id INT = NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @doc_id BIGINT;
    SELECT @doc_id = document_id FROM kg.Document WHERE source_system=@source_system AND external_key=@external_key;
    IF @doc_id IS NULL
    BEGIN
      INSERT INTO kg.Document (source_system, external_key, title, mime_type, summary, hash)
      VALUES (@source_system, @external_key, @title, @mime_type, @summary, @hash);
      SET @doc_id = SCOPE_IDENTITY();
    END
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.DOCUMENT_FOR WHERE $from_id = (SELECT $node_id FROM kg.Document WHERE document_id=@doc_id)
        AND $to_id = (SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id))
      INSERT INTO kg.DOCUMENT_FOR ($from_id,$to_id)
        VALUES ((SELECT $node_id FROM kg.Document WHERE document_id=@doc_id),(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id));
    IF @asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.DOCUMENT_FOR WHERE $from_id = (SELECT $node_id FROM kg.Document WHERE document_id=@doc_id)
        AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id))
      INSERT INTO kg.DOCUMENT_FOR ($from_id,$to_id)
        VALUES ((SELECT $node_id FROM kg.Document WHERE document_id=@doc_id),(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id));
    SELECT @doc_id AS document_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_UpsertDocumentAndLink',@external_key,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

-- Invoice
CREATE OR ALTER PROCEDURE kg.usp_UpsertInvoiceAndLink
  @invoice_number NVARCHAR(80),
  @invoice_date DATE,
  @total_amount DECIMAL(18,2)=NULL,
  @currency CHAR(3)=NULL,
  @status NVARCHAR(40)=NULL,
  @vendor_id INT=NULL,
  @ticket_id INT=NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @invoice_id BIGINT;
    SELECT @invoice_id = invoice_id FROM kg.Invoice WHERE invoice_number=@invoice_number;
    IF @invoice_id IS NULL
    BEGIN
      INSERT INTO kg.Invoice(invoice_number, invoice_date, total_amount, currency, status, vendor_id)
      VALUES(@invoice_number,@invoice_date,@total_amount,@currency,@status,@vendor_id);
      SET @invoice_id = SCOPE_IDENTITY();
    END
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.RELATES_INVOICE WHERE $from_id=(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id)
        AND $to_id=(SELECT $node_id FROM kg.Invoice WHERE invoice_id=@invoice_id))
      INSERT INTO kg.RELATES_INVOICE($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id),(SELECT $node_id FROM kg.Invoice WHERE invoice_id=@invoice_id));
    SELECT @invoice_id AS invoice_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_UpsertInvoiceAndLink',@invoice_number,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

-- Remote Session
CREATE OR ALTER PROCEDURE kg.usp_UpsertRemoteSessionAndLink
  @provider NVARCHAR(40), @session_code NVARCHAR(120), @started_at DATETIME2(3), @ended_at DATETIME2(3)=NULL,
  @technician NVARCHAR(120)=NULL, @outcome NVARCHAR(200)=NULL, @ticket_id INT=NULL, @asset_id INT=NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @remote_session_id BIGINT;
    SELECT @remote_session_id = remote_session_id FROM kg.RemoteSession WHERE provider=@provider AND session_code=@session_code;
    IF @remote_session_id IS NULL
    BEGIN
      INSERT INTO kg.RemoteSession(provider,session_code,started_at,ended_at,technician,outcome)
      VALUES(@provider,@session_code,@started_at,@ended_at,@technician,@outcome);
      SET @remote_session_id = SCOPE_IDENTITY();
    END
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SESSION_FOR WHERE $from_id=(SELECT $node_id FROM kg.RemoteSession WHERE remote_session_id=@remote_session_id)
        AND $to_id=(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id))
      INSERT INTO kg.SESSION_FOR($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.RemoteSession WHERE remote_session_id=@remote_session_id),(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id));
    IF @asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SESSION_FOR WHERE $from_id=(SELECT $node_id FROM kg.RemoteSession WHERE remote_session_id=@remote_session_id)
        AND $to_id=(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id))
      INSERT INTO kg.SESSION_FOR($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.RemoteSession WHERE remote_session_id=@remote_session_id),(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id));
    SELECT @remote_session_id AS remote_session_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_UpsertRemoteSessionAndLink',@session_code,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

-- External File link
CREATE OR ALTER PROCEDURE kg.usp_LinkExternalFile
  @system NVARCHAR(60), @external_path NVARCHAR(400), @title NVARCHAR(240)=NULL, @file_type NVARCHAR(40)=NULL,
  @ticket_id INT=NULL, @asset_id INT=NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @external_file_id BIGINT;
    SELECT @external_file_id = external_file_id FROM kg.ExternalFile WHERE system=@system AND external_path=@external_path;
    IF @external_file_id IS NULL
    BEGIN
      INSERT INTO kg.ExternalFile(system, external_path, title, file_type)
      VALUES(@system,@external_path,@title,@file_type);
      SET @external_file_id = SCOPE_IDENTITY();
    END
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.RELATES_FILE WHERE $from_id=(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id)
        AND $to_id=(SELECT $node_id FROM kg.ExternalFile WHERE external_file_id=@external_file_id))
      INSERT INTO kg.RELATES_FILE($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id),(SELECT $node_id FROM kg.ExternalFile WHERE external_file_id=@external_file_id));
    IF @asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.RELATES_FILE WHERE $from_id=(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id)
        AND $to_id=(SELECT $node_id FROM kg.ExternalFile WHERE external_file_id=@external_file_id))
      INSERT INTO kg.RELATES_FILE($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id),(SELECT $node_id FROM kg.ExternalFile WHERE external_file_id=@external_file_id));
    SELECT @external_file_id AS external_file_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_LinkExternalFile',@external_path,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

-- Knowledge Snippet
CREATE OR ALTER PROCEDURE kg.usp_UpsertKnowledgeSnippet
  @source NVARCHAR(60), @label NVARCHAR(200)=NULL, @content NVARCHAR(MAX),
  @ticket_id INT=NULL, @asset_id INT=NULL, @document_id BIGINT=NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @snippet_id BIGINT;
    -- Basic de-dupe by hash of content (optional: simplistic)
    DECLARE @hash NVARCHAR(64) = CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', @content),2);
    SELECT @snippet_id = snippet_id FROM kg.KnowledgeSnippet WHERE label=@label AND @label IS NOT NULL;
    IF @snippet_id IS NULL
    BEGIN
      INSERT INTO kg.KnowledgeSnippet(source,label,content)
      VALUES(@source,@label,@content);
      SET @snippet_id = SCOPE_IDENTITY();
    END
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SNIPPET_REF WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id))
      INSERT INTO kg.SNIPPET_REF($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id));
    IF @asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SNIPPET_REF WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id))
      INSERT INTO kg.SNIPPET_REF($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id));
    IF @document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.DERIVED_FROM WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Document WHERE document_id=@document_id))
      INSERT INTO kg.DERIVED_FROM($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Document WHERE document_id=@document_id));
    SELECT @snippet_id AS snippet_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_UpsertKnowledgeSnippet',@label,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

PRINT '22_kg_extensions.sql applied';
GO
