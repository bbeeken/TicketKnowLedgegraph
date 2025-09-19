## Qdrant Vector Search (Optional)

To enable fast semantic search, you can run Qdrant alongside the API using Docker Compose:

```sh
# Start Qdrant (optional profile)
docker compose --profile qdrant up -d qdrant
```

**Environment variables for API:**

- `QDRANT_URL` (e.g. `http://qdrant:6333` in compose, or `http://localhost:6333` for local dev)
- `QDRANT_COLLECTION` (default: `opsgraph_snippets`)
- `QDRANT_API_KEY` (if you set one in the compose env)

**Backfill existing embeddings:**

```sh
cd api
npx tsx scripts/qdrant_backfill.ts
```

The API will use Qdrant for semantic search and chat retrieval when configured. If Qdrant is unavailable, it will fallback to in-app scoring.

**Troubleshooting:**
- Check `/api/health/ai` for Qdrant status (reachable, collection, points count, degraded flag)
- If Qdrant is not reachable, ensure the service is running and ports are mapped (6333)
- If using an API key, set `QDRANT_API_KEY` in both compose and API env

**Compose profile:**
- The Qdrant service is under the `qdrant` profile. To run with the rest of the stack, add `--profile qdrant` to your compose commands.

## Microsoft SSO Authentication (Optional)

OpsGraph supports Microsoft Azure AD (Entra ID) single sign-on for enterprise authentication.

**Azure App Registration Setup:**

1. Register a new application in Azure Portal → App registrations
2. Add redirect URI: `http://localhost:3002/auth/callback/microsoft` (dev) or your production callback URL
3. Enable ID tokens under Authentication → Implicit grant and hybrid flows
4. Generate a client secret under Certificates & secrets
5. Note the Application (client) ID and Directory (tenant) ID

**Environment variables for API:**

- `AZURE_CLIENT_ID` - Application (client) ID from Azure app registration
- `AZURE_CLIENT_SECRET` - Client secret from Azure app registration  
- `AZURE_TENANT_ID` - Directory (tenant) ID (or 'common' for multi-tenant)
- `AZURE_REDIRECT_URI` - Callback URL (e.g. `http://localhost:3002/auth/callback/microsoft`)

**Environment variables for UI:**

- `NEXT_PUBLIC_AZURE_CLIENT_ID` - Same as API client ID
- `NEXT_PUBLIC_AZURE_TENANT_ID` - Same as API tenant ID
- `NEXT_PUBLIC_AZURE_REDIRECT_URI` - Same as API redirect URI

**How it works:**
1. UI redirects user to Microsoft login at `/auth/microsoft/callback`
2. User authenticates with Microsoft and is redirected back with an authorization code
3. UI calls `/api/auth/microsoft/callback` with the code
4. API exchanges code for tokens, fetches user profile from Microsoft Graph
5. API upserts user to local database and issues JWT tokens
6. UI stores tokens and user is authenticated

**Troubleshooting:**
- Check `/api/health` and `/api/auth/microsoft/callback` endpoints
- If SSO returns "Microsoft SSO not configured", verify all Azure environment variables are set
- If callback fails, ensure redirect URI matches exactly between Azure registration and env vars
- User permissions are mapped from `app.Users` table and site assignments in `app.UserSiteAccess`

**Local Development:**
- Microsoft SSO will return "not configured" error if Azure env vars are missing
- The system gracefully falls back to local authentication when SSO is not configured
- For testing without Azure setup, use local auth via `/api/auth/local/signin`

## Environment Variables Summary

### Required (Database)
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` - SQL Server connection details

### Optional (Microsoft SSO)
- API: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_REDIRECT_URI`
- UI: `NEXT_PUBLIC_AZURE_CLIENT_ID`, `NEXT_PUBLIC_AZURE_TENANT_ID`, `NEXT_PUBLIC_AZURE_REDIRECT_URI`

### Optional (Qdrant Vector Search)
- `QDRANT_URL` (e.g. `http://qdrant:6333`)
- `QDRANT_COLLECTION` (default: `opsgraph_snippets`)
- `QDRANT_API_KEY` (if authentication enabled)

### Optional (OpenAI Embeddings)
- `OPENAI_API_KEY` - Required for real embeddings (falls back to mock if absent)
- `OPENAI_EMBED_MODEL` (default: `text-embedding-3-small`)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)
- `OPENAI_EMBED_ALLOW_FALLBACK` (default: `false`)

### Health Monitoring
- Use `GET /api/health/ai` to check Qdrant and embedding status
- Use `GET /health` for basic API health
- Check Docker container health with `docker compose ps`

# OpsGraph - Enterprise Ticketing & Knowledge Graph

## 🚀 Quick Start

### Development
```bash
# Start all services
docker-compose up -d

# Apply security updates
.\apply-security-updates.ps1

# Validate security
.\validate-security.ps1
```

### Production (Enhanced Security)
```bash
# Production deployment with security hardening
docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d
```

## 🔐 Security Features

### Docker Security Improvements
- **Updated Base Images**: Python 3.12-slim, Node.js 22-alpine (eliminates high vulnerabilities)
- **Non-root Users**: All containers run as non-root users (uid 1001)
- **Security Options**: no-new-privileges, capability dropping
- **Read-only Filesystems**: Production containers use read-only root filesystems
- **Build Security**: Comprehensive `.dockerignore` files prevent secret exposure

### Validation
Run `.\validate-security.ps1` to check container security settings.

## 📊 Architecture

- **Database**: SQL Server with knowledge graph (nodes/edges)
- **API**: Node.js/Fastify with JWT auth and RLS
- **UI**: Next.js with real-time updates
- **Workers**: Python background services for alerts and ML
- **Security**: Multi-layer security with Docker hardening

## 📁 Database Schema

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

**Service URLs:**
- API: http://localhost:3001 (Fastify backend)
- UI: http://localhost:3002 (Next.js frontend)  
- Worker admin: http://localhost:8000/health
- Database: localhost:1433 (SQL Server)
- Qdrant (optional): http://localhost:6333

## API Docs

- OpenAPI/Swagger: http://localhost:3001/documentation

## Testing

- API: `cd api && npm test`
- Worker: `cd worker && pytest`

## Lint/Format

- API: `npm run lint && npm run format`
- Worker: `black . && ruff .`

## RLS

All API/worker DB access sets `SESSION_CONTEXT('user_id')` per request/loop.

## 🔎 AI / Embeddings Integration

The knowledge ingestion pipeline can generate semantic embeddings for document/image-derived snippets.

Environment variables (API service):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | (none) | If set, real OpenAI embeddings are used. |
| `OPENAI_EMBED_MODEL` | No | `text-embedding-3-small` | Embedding model name. Adjust to change vector dimension. |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Override for Azure/OpenAI-compatible gateway. |
| `OPENAI_EMBED_ALLOW_FALLBACK` | No | `false` | If `true`, deterministic mock used when key missing or API fails. |
| `EMBED_CACHE_MAX` | No | `500` | Max in-memory cached embeddings (LRU). |

Behavior:
- If `OPENAI_API_KEY` is absent, a deterministic mock embedding (length 512) is generated so search & tests still function.
- Real model dimensions (e.g. `text-embedding-3-small` = 1536, `text-embedding-3-large` = 3072) are inferred; fallback assumption is 1536.
- Embedding generation capped to first ~8000 characters of input to control token usage.

Files:
- Provider: `api/src/ai/embeddings.ts`
- Route usage: `api/src/routes/knowledge-ingestion.ts` (`generateEmbedding` helper)
- Test: `api/test/embeddings.spec.ts`

Next steps (optional):
- Backfill script for legacy snippets without embeddings.
- Approximate NN indexing if snippet volume grows (external vector store or custom index).
- Add rate limiting / caching of frequent identical embedding requests.

### Backfill Script

Run (after setting DB env vars in `.env`):
```bash
cd api
node -r dotenv/config scripts/backfill_embeddings.ts
```

### AI Health Endpoint

`GET /api/health/ai` returns comprehensive AI and vector search status:

**Response Format:**
```json
{
  "status": "ok",
  "embedding": {
    "model": "text-embedding-3-small",
    "dimension": 1536,
    "provider": "openai",
    "fallback_allowed": false,
    "degraded": false
  },
  "qdrant": {
    "configured": true,
    "reachable": true,
    "collection_exists": true,
    "points_count": 1250,
    "degraded": false
  }
}
```

**Status Indicators:**
- `embedding.degraded`: True when using mock embeddings or fallback mode
- `qdrant.configured`: True when `QDRANT_URL` environment variable is set
- `qdrant.reachable`: True when Qdrant service responds to health checks
- `qdrant.collection_exists`: True when the configured collection exists
- `qdrant.degraded`: True when Qdrant is configured but not fully functional

**Troubleshooting:**
- If `qdrant.configured` is false, set `QDRANT_URL` environment variable
- If `qdrant.reachable` is false, check if Qdrant container is running and accessible
- If `qdrant.collection_exists` is false, run the backfill script to create the collection
- Use this endpoint to monitor AI subsystem health in production

### Qdrant Collection Setup

If using Qdrant for the first time, run the backfill script to create the collection and index existing data:

```bash
cd api
npx tsx scripts/qdrant_backfill.ts
```

This script will:
- Create the `opsgraph_snippets` collection (or your configured collection name)
- Generate embeddings for existing knowledge snippets
- Index them in Qdrant for semantic search


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

## Vendor Service Requests (Ticket Detail Enhancement)

The ticket detail UI now includes a dedicated panel for vendor service requests:

Component: `ui/src/components/tickets/VendorServiceRequestsPanel.tsx`

Backend endpoints (Fastify):
- `GET /api/tickets/:ticket_id/service-requests` – list service requests for a ticket
- `POST /api/tickets/:ticket_id/service-request` – create or update (upsert) a service request
- `GET /api/service-requests/:vsr_id` – fetch a single service request
- `GET /api/service-requests/:vsr_id/history` – immutable change history
- `PATCH /api/service-requests/:vsr_id/status` – atomic status (and optional notes) update

Persistence objects (migration `31_vendor_service_requests.sql`):
- `app.VendorServiceRequestHistory`
- Procedures: `app.usp_ListVendorServiceRequests`, `app.usp_GetVendorServiceRequest`, `app.usp_GetVendorServiceRequestHistory`, `app.usp_UpdateVendorServiceRequestStatus`, enhanced `app.usp_UpsertVendorServiceRequest` (now records history & user attribution).

History captures: change_type (created|updated|status_change), old/new status, old/new notes, user id, timestamp.

Front-end behaviors:
- Inline status select triggers PATCH call with optimistic UI update & revert on failure.
- Creation modal supports vendor, request type, status, notes.
- History modal shows chronological changes for selected request.
- Per-vendor latest notes cached in `localStorage` key pattern: `ticket_<ticketId>_vendorNotes`.

RLS: Requests execute under the existing session context; future hardening may add explicit predicates if vendor scoping requirements emerge.

Next potential enhancements:
- Optimistic concurrency using rowversion on `VendorServiceRequests`.
- SSE/WebSocket events for real-time updates.
- Linking service requests to outbound vendor integration workflows.
