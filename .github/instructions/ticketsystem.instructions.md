---
applyTo: "**"
---

Developer: System Instructions (Pin These) — Node.js/Python Only
Project: OpsGraph (Enterprise)
Mission

Establish system-wide standards for the OpsGraph backend (enterprise ticketing + knowledge graph across fuel systems, networks, store equipment, user devices, buildings/utilities, security, compliance). Backend only. SQL Server 2019+ (OpsGraph DB). No frontend/UI.

Allowed Tech (hard constraint)

Languages: Node.js (TypeScript) and/or Python 3.11+.

Do NOT propose or generate: .NET, C#, Java, Go, Ruby, PHP, or any other backend stack.

If an API is requested: default to Node.js + Fastify (TypeScript).

If a background service/worker is requested: default to Python + FastAPI/APSche­duler (or Node.js worker if asked).

SQL access: Node → mssql (Tedious) with parameterized queries; Python → pyodbc/aioodbc.

Auth: JWT (HS256); Argon2id for password hashing.

Logging: pino (Node) / structlog/loguru (Python).

Docs: OpenAPI/Swagger via fastify-swagger (Node) / FastAPI (Python).

Any suggestion that mentions .NET/C# is non-compliant and must be rewritten to Node/Python equivalents.

Platform Scope & Schemas

Database: SQL Server 2019+, new DB OpsGraph

Schemas:

app — system of record (org, assets, events, alerts, tickets)

kg — SQL Server Graph (nodes/edges + reasoning views/TVFs)

sec — security / RLS

All timestamps: UTC DATETIME2(3) only.

Core Guidance (apply to all code & prompts)

Idempotency: use IF NOT EXISTS + CREATE OR ALTER everywhere (DDL/procs/views).

RLS: enforce via sec.fn_TicketAccessPredicate and SESSION_CONTEXT('user_id').

Every API request must execute:

EXEC sys.sp_set_session_context @key=N'user_id', @value=@UserId;

Graph: use SQL Server Graph in kg (AS NODE/AS EDGE). No duplicate edges; ADJACENT_TO is bidirectional; no self-loops.

Contracts stable: never rename/remove columns in views/TVFs; add new fields additively.

Outbox: triggers on Tickets/Alerts/Events + app.usp_Outbox_DequeueBatch.

Temporal: app.Tickets, app.TicketAssignments under SYSTEM_VERSIONING.

FTS: tickets (summary/description) + comments (body) with a stable search surface.

Errors: all write procs wrap TRY/CATCH and log to app.IntegrationErrors.

Indexes: tuned for open tickets, recent alerts, event lookups, site/asset filters (use filtered indexes).

Data Model & Ontology

Nodes: Site, Building, Floor, Room/Zone, Asset, Event, Alert, Ticket, User, Team, Vendor

Edges: HAS_BUILDING, HAS_FLOOR, HAS_ROOM, HAS_ZONE, HAS_ASSET, IN_ZONE, ADJACENT_TO,
CONNECTS_TO, FEEDS_POWER, BACKUP_FOR,
ON_ASSET, PROMOTED_TO, LOCATED_AT, MONITORS, CONTROLS,
CREATED_TICKET, RELATES_TO.

Domain packs (extension tables keyed by asset_id): Fuel, Power, Network, POS, HVAC, Security, Building, Endpoint.

Event normalization: app.CodeMap(domain, source, vendor_code) → (canonical_code, canonical_level); store raw JSON in app.Events.vendor_payload with ISJSON.

Ticket Taxonomy (canonical + legacy mapping)

Tables: app.Categories, app.CategorySynonyms, app.LegacyCategoryMap, app.Statuses, app.Substatuses, app.LegacyStatusMap.

Wire tickets: Tickets.status → Statuses; Tickets.substatus_code → Substatuses; Tickets.category_id → Categories.

Statuses: Open, InProgress, Closed, Canceled (+ substatuses like AwaitingAssignment, Researching, etc.).

Legacy mappings: Map all 50 legacy categories and 8 legacy statuses to the canonical taxonomy (slugs provided in sprint prompts).

Site Directory & Seeds

Keep app.Sites slim; add app.SiteDirectory (label, display_name, address, phone, email, PDI name, Caribou ID, fuel dispenser count, is_travel_plaza).

TZ policy: default America/Chicago; Hot Springs SD = America/Denver.

Seed the 7 provided sites; mirror to kg.Site and initial edges.

Performance & Contracts

Views/TVFs (must not change columns):

app.vw_OpenAlertsBySite → site_id, alert_id, raised_at, code, level, asset_id, asset_type, zone_label, ticket_id

kg.fn_CofailAdjacent(@site_id INT, @window_minutes INT) → co-fail output cols

kg.vw_CofailAdjacent120 → wraps TVF

Stubs: kg.vw_NetworkBlastRadius, kg.vw_PowerBlastRadius, kg.vw_FoodSafetyHotCases

Indexes (minimum):

app.Events(canonical_code, occurred_at); app.Events(asset_id, occurred_at)

app.Alerts(raised_at) filtered last 60 days

app.Tickets(site_id, status, updated_at) filtered (open)

app.Assets(site_id,type); app.Assets(zone_id)

Deliverables & Output Rules

When asked to generate Sprint files: output each file in its own fenced code block, with the filename in the fence header:

-- filename: 01_app_relational_core.sql

Never output placeholders. Provide complete, executable T-SQL and code.

Do not invent new files or alter filenames except via explicit migration instructions.

If an answer suggests .NET/C#: replace with Node.js or Python equivalents without asking.

Acceptance (always verify)

SQL scripts run idempotently; smoke test returns rows from all required views/TVFs.

RLS enforces site scoping when SESSION_CONTEXT('user_id') is set.

Outbox triggers fire; dequeue works; IntegrationErrors captures failures.

Temporal stays ON; FTS functional; indexes present.

🧪 Compliance Guard (No .NET)

Before finalizing any answer:

Check: Have I mentioned .NET/C#/ASP.NET? → If yes, replace with Node/Python guidance.

Default stacks: Node+Fastify for API, Python+FastAPI for worker/admin.
