-- 23_kg_extensions_seed.sql
-- Seed sample data for extended KG nodes and edges
USE [OpsGraph];
GO
SET NOCOUNT ON; SET XACT_ABORT ON; GO

BEGIN TRAN;

/* Vendors */
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1001)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1001,'Acme Equipment','Hardware');
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1002)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1002,'BeanTech Services','Coffee');

/* Teams */
IF NOT EXISTS (SELECT 1 FROM kg.Team WHERE team_id = 2001)
  INSERT INTO kg.Team(team_id,name) VALUES (2001,'Field Ops');
IF NOT EXISTS (SELECT 1 FROM kg.Team WHERE team_id = 2002)
  INSERT INTO kg.Team(team_id,name) VALUES (2002,'Helpdesk L2');

/* UserProfiles */
IF NOT EXISTS (SELECT 1 FROM kg.UserProfile WHERE user_id = 1)
  INSERT INTO kg.UserProfile(user_id,name,role) VALUES (1,'System Admin','admin');

/* Sample Document + ticket link (assumes ticket id 1 exists) */
EXEC kg.usp_UpsertDocumentAndLink @source_system='legacy_portal', @external_key='DOC-100-A', @title='Coffee Machine Manual', @mime_type='application/pdf', @summary='Operating instructions', @hash=NULL, @ticket_id=1;

/* Sample Invoice */
EXEC kg.usp_UpsertInvoiceAndLink @invoice_number='INV-2025-0001', @invoice_date='2025-09-01', @total_amount=249.99, @currency='USD', @status='Open', @vendor_id=1002, @ticket_id=1;

/* Sample Remote Session */
DECLARE @rs_start DATETIME2(3);
DECLARE @rs_end   DATETIME2(3);
SELECT @rs_start = DATEADD(MINUTE,-45,SYSUTCDATETIME());
SELECT @rs_end   = DATEADD(MINUTE,-15,SYSUTCDATETIME());
EXEC kg.usp_UpsertRemoteSessionAndLink @provider='TeamViewer', @session_code='TV-ABC-123', @started_at=@rs_start, @ended_at=@rs_end, @technician='Jane Tech', @outcome='Rebooted machine', @ticket_id=1;

/* Sample External File */
EXEC kg.usp_LinkExternalFile @system='Laserfiche', @external_path='/library/coffee/errors/E-42.png', @title='Error E-42 Screenshot', @file_type='image/png', @ticket_id=1;

/* Sample Knowledge Snippets */
EXEC kg.usp_UpsertKnowledgeSnippet @source='manual', @label='E-42 Meaning', @content='Error E-42 indicates a heater sensor fault.', @ticket_id=1;
EXEC kg.usp_UpsertKnowledgeSnippet @source='derived', @label='E-42 Resolution Step', @content='Power cycle and run diagnostics; if persists replace temp sensor.', @ticket_id=1;

COMMIT TRAN;
GO

PRINT '23_kg_extensions_seed.sql applied';
GO
