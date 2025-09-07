# OpsGraph Database Schema

## How to Run Scripts

1. Run scripts in order: 00_create_database.sql, 01_app_relational_core.sql, 02_enums_calendars_temporal.sql, 03_security_rls.sql, 04_outbox_and_triggers.sql, 05_fulltext_search.sql, 06_kg_graph_schema.sql, 07_functions_and_procs.sql, 08_views_and_tvfs.sql, 09_partitioning_plan_optional.sql (optional), 99_smoke_test.sql.
2. Use SQL Server Management Studio or sqlcmd. Each script is idempotent.

## File/Schema Overview

- **00_create_database.sql**: Creates DB, schemas, base config.
- **01_app_relational_core.sql**: Core app tables (users, org, tickets, assets, events, etc).
- **02_enums_calendars_temporal.sql**: Domain enums, calendars, temporal tables.
- **03_security_rls.sql**: Row-level security, RLS predicates, policies, grants.
- **04_outbox_and_triggers.sql**: Outbox, integration errors, triggers, dequeue proc.
- **05_fulltext_search.sql**: Full-text catalog, indexes, FTS view.
- **06_kg_graph_schema.sql**: Knowledge graph (SQL Graph nodes/edges), seeds.
- **07_functions_and_procs.sql**: Core procs/functions for ingest, upsert, mirroring.
- **08_views_and_tvfs.sql**: Views and TVFs for reporting, graph analytics.
- **09_partitioning_plan_optional.sql**: Partitioning (optional, guarded).
- **99_smoke_test.sql**: Seeds, demo data, smoke tests.

## RLS Usage

- Set SESSION_CONTEXT('user_id') in client before queries:
  ```sql
  EXEC sp_set_session_context 'user_id', 1234;
  ```
- RLS restricts access to tickets/events/alerts by site membership (see sec.fn_TicketAccessPredicate).

## Write Procs

- `app.usp_UpsertEventFromVendor @payload NVARCHAR(MAX)` — Upserts event from JSON, maps codes, mirrors to graph, logs errors.
- `app.usp_CreateOrUpdateTicket @payload NVARCHAR(MAX), @expected_rowversion BINARY(8)=NULL` — Upserts ticket, assets, status history, mirrors to graph, logs errors.
- `kg.usp_PromoteEventToAlert @event_id, @rule, @priority` — Promotes event to alert, mirrors to graph.

## Outbox

- Use `app.usp_Outbox_DequeueBatch @batch_size` to dequeue/publish integration events.

## Full-Text Search

- Use `app.vw_TicketSearchFTS` for FTS queries (see 05_fulltext_search.sql).

## Ops/Notes

- Backup/restore as normal SQL DB.
- Partitioning (see 09_partitioning_plan_optional.sql) is optional and guarded.
- Error triage: see `app.IntegrationErrors`.

# OpsGraph Backend (Sprint 2)

## Prerequisites
- Docker + Docker Compose

## Quick Start

```sh
docker-compose up --build
```

API: http://localhost:3000  
Worker admin: http://localhost:8000/health

## API Docs

- OpenAPI/Swagger: http://localhost:3000/documentation

## Testing

- API: `cd api && npm test`
- Worker: `cd worker && pytest`

## Lint/Format

- API: `npm run lint && npm run format`
- Worker: `black . && ruff .`

## RLS

All API/worker DB access sets `SESSION_CONTEXT('user_id')` per request/loop.

## Outbox

Worker dequeues from `app.usp_Outbox_DequeueBatch` and POSTs to API SSE/webhooks.

---

```typescript
// api-node/src/util/http.ts

import { FastifyReply } from "fastify";
import { errorResponse } from "./errors";

export function sendError(
  reply: FastifyReply,
  message: string,
  code: string,
  status = 400
) {
  const { body } = errorResponse(message, code, status);
  reply.code(status).send(body);
}
```
