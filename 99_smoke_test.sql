-- 99_smoke_test.sql
-- Seeds, demo data, smoke tests
USE [OpsGraph];
GO

-- Ensure app/graph seeds (Sites/Zones/Adjacency/Assets/CodeMap, enums, calendars)
-- (Already seeded in 01/02/06 scripts)

-- Ingest two events
DECLARE @payload1 NVARCHAR(MAX) = N'{"source":"franklin","occurred_at":"2025-09-03T11:33:00Z","site_id":1006,"asset_id":555,"code":"ATG_COMM_ERR","message":"Console communication timeout"}';
DECLARE @payload2 NVARCHAR(MAX) = N'{"source":"insite360","occurred_at":"2025-09-03T11:40:00Z","site_id":1006,"asset_id":321,"code":"FLOW_FAULT","message":"Dispenser 3 Node B flow threshold exceeded"}';

EXEC app.usp_UpsertEventFromVendor @payload1;
EXEC app.usp_UpsertEventFromVendor @payload2;

-- Promote to alert if needed
DECLARE @atg_event_id CHAR(26) = (SELECT TOP 1 event_id FROM app.Events WHERE vendor_code = 'ATG_COMM_ERR');
EXEC kg.usp_PromoteEventToAlert @event_id = @atg_event_id, @rule = N'level>=major', @priority = 80;

-- Create demo ticket
DECLARE @ticket_payload NVARCHAR(MAX) = N'{"status":"Open","severity":5,"category_id":1,"summary":"ATG and Dispenser Faults","description":"Multiple faults detected","site_id":1006,"created_by":NULL,"assignee_user_id":NULL,"team_id":NULL,"vendor_id":NULL,"due_at":NULL,"sla_plan_id":NULL,"asset_ids":[555,321]}';
EXEC app.usp_CreateOrUpdateTicket @payload = @ticket_payload;

-- Show results
SELECT TOP 10 * FROM app.vw_OpenAlertsBySite WHERE site_id=1006;
SELECT * FROM kg.fn_CofailAdjacent(1006,120);
SELECT * FROM kg.vw_CofailAdjacent120 WHERE site_id=1006;
SELECT TOP 5 * FROM app.TicketStatusHistory ORDER BY changed_at DESC;
SELECT TOP 5 * FROM app.Outbox WHERE published=0;
