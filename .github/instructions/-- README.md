-- README.md
-- OpsGraph Backend (SQL Server 2019+) - Setup & Usage

-- How to Run (order)
-- 1) 00_create_database.sql
-- 2) 01_app_relational_core.sql
-- 3) 02_enums_calendars_temporal.sql
-- 4) 03_security_rls.sql
-- 5) 04_outbox_and_triggers.sql
-- 6) 05_fulltext_search.sql
-- 7) 06_kg_graph_schema.sql
-- 8) 07_functions_and_procs.sql
-- 9) 08_views_and_tvfs.sql
-- 10) 09_partitioning_plan_optional.sql (optional)
-- 11) 10_domainpacks_fuel_network_pos.sql
-- 12) 11_site_directory_seed.sql
-- 13) 99_smoke_test.sql

-- Schemas
-- - app: System of record (tickets, events, alerts, org, domain packs, outbox)
-- - kg:  SQL Graph (nodes/edges)
-- - sec: Security (RLS predicates/policies)

-- RLS Usage
-- - Before querying, set session context user id for site-scoped access:
--   EXEC sys.sp_set_session_context @key=N'user_id', @value=<app.Users.user_id>;
-- - Membership is via app.UserTeams -> app.TeamSites.
-- - Admins (role app_admin) bypass RLS.

-- Write Procedures
-- - app.usp_UpsertEventFromVendor @payload NVARCHAR(MAX)
--   Payload: {"source","occurred_at","site_id","asset_id","code","message",["domain"]}
--   Maps via app.CodeMap(domain,source,vendor_code) -> (canonical_code, canonical_level).
--   Upserts app.Events; promotes to app.Alerts for major/critical; mirrors to kg; logs errors.
-- - app.usp_CreateOrUpdateTicket @payload NVARCHAR(MAX), @expected_rowversion BINARY(8)=NULL
--   Upserts app.Tickets; writes status history; upserts TicketAssets; mirrors to kg; outbox; logs errors.
-- - kg.usp_PromoteEventToAlert @event_id, @rule, @priority
--   Ensures alert in app+kg and edges.

-- Outbox
-- - Triggers on app.Events/app.Alerts/app.Tickets write to app.Outbox.
-- - Dequeue: EXEC app.usp_Outbox_DequeueBatch @batch_size = 100;

-- Full-Text Search
-- - Catalog ftsOpsGraph installed.
-- - Query via TVF: SELECT * FROM app.vw_TicketSearchFTS(N'"flow" OR "comms"');
--   Returns: ticket_id, rank, summary, status, severity, site_id, updated_at.

-- Graph
-- - Nodes: Site, Zone, Asset, Event, Alert, Ticket.
-- - Edges: HAS_ZONE, HAS_ASSET, IN_ZONE, ADJACENT_TO, ON_ASSET, LOCATED_AT, PROMOTED_TO, CREATED_TICKET, RELATES_TO (+ CONNECTS_TO, FEEDS_POWER, BACKUP_FOR).
-- - Edges guarded with NOT EXISTS on $from_id/$to_id.

-- Temporal
-- - Enabled on app.Tickets and app.TicketAssignments with history tables:
--   app.TicketsHistory, app.TicketAssignmentsHistory.

-- Partitioning (optional)
-- - pf_Monthly/ps_Monthly with helpers to split next boundary and compress stubs.

-- Smoke Test
-- - Run 99_smoke_test.sql after seeding; it ingests 2 events, creates a ticket, and returns rows from views/TVFs/outbox.

-- Operations
-- - Backup/restore: regular SQL processes.
-- - Partitioning toggle: use 09_partitioning_plan_optional.sql.
-- - Error triage: SELECT * FROM app.IntegrationErrors ORDER BY