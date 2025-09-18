# Copilot instructions for this repo

Purpose: give AI coding agents the minimum context to be productive in this codebase. Keep suggestions aligned to the actual patterns in the repo.

## Big picture

- Services (docker-compose):
  - Database: SQL Server (2019+), strong focus on Row-Level Security (RLS) and SQL Graph. Schema and procs are in top-level `*.sql` files.
  - API: Node.js Fastify (TypeScript) exposing REST under `/api`. JWT auth. RLS enforced by setting SQL Server `SESSION_CONTEXT('user_id')` from JWT `sub`.
  - UI: Next.js app consuming the API via `NEXT_PUBLIC_API_BASE_URL` (defaults set in compose). Stores token in browser localStorage.
  - Worker(s): Python background services (alerts/outbox). Communicate with API and DB.

## Run, build, test

- Fast path (local): `docker compose up -d` (see `docker-compose.yml`).
- API docs: http://localhost:3001/documentation (swagger-ui). Health: `/health`, `/api/health/auth` (requires JWT).
- VS Code tasks you can run:
  - “Rebuild and restart ui+api with docker compose”
  - “Rebuild UI with new build ARG”
  - “Rebuild UI container”
- API package scripts: `npm run build` (tsc), `npm start` (runs `dist/server.js`), `npm test` (vitest). The API expects DB env vars present; in compose these are provided.

## Auth and client patterns

- Local sign-in: `POST /api/auth/local/signin` with `{ email, password }` → returns `{ access_token, refresh_token, user }`.
- Include `Authorization: Bearer <token>` on all `/api/**` calls. Tokens expire in 15m; refresh via `POST /api/auth/refresh`.
- UI token handling: token is stored under `localStorage['opsgraph_token']`. The client helper in `ui/src/lib/api/client.ts` automatically sets the header and redirects to `/login` on 401.

## RLS and database access (critical)

- RLS key: SQL Server `SESSION_CONTEXT('user_id')` must be set for any request that touches protected tables.
- The server sets the context in a Fastify `preHandler` using the JWT `sub`. Use one of these patterns in new code:
  - Use `withRls(userId, async (conn) => { /* conn.request().query(...) */ })` from `api/src/sql.ts` for background jobs and simple blocks.
  - For request-scoped transactions, prefer attaching/using the per-request SQL connection from `api/src/db/sql.ts` via `SQL_CONN_SYMBOL` and `getSqlConnection`/`getRequestFromContext` (see `api/src/routes/tickets.ts`).
- Never query directly without ensuring RLS context; otherwise results will ignore security predicates.
- DB env required by API (validated at startup): `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`. Compose also provides `DB_CONNECTION_STRING` for some helpers.

## Route structure and validation

- All API routes are registered with prefix `/api` in `api/src/server.ts`.
- Use Zod for payload validation (see `auth`, `tickets` routes). Return `reply.code(...).send({...})` with clear error shapes.
- Swagger is configured with bearerAuth; keep new routes documented by adding Fastify schemas where convenient.

## Optimistic concurrency (tickets)

- `GET /api/tickets/:id` returns `ETag: W/"<base64 rowversion>"` (from `rowversion` column). See `api/src/routes/tickets.ts`.
- On updates (e.g. `PATCH /api/tickets/:id`), require client to send `If-Match: W/"<same-base64>"`. The server decodes it and passes as expected rowversion to procs.

## Knowledge Graph and real-time

- Graph queries are implemented in `api/src/sql.ts` and routed via `api/src/routes/kg*.ts` (nodes/edges, analytics, SSE/WebSocket endpoints).
- Server-Sent Events endpoints are under `/api/sse/**` for ticket/alert/kg updates.

## UI integration specifics

- Base URL: `NEXT_PUBLIC_API_BASE_URL` is set to `http://localhost:3001/api` in compose; the UI helper concatenates paths (e.g., `apiFetch('/tickets')`).
- Multipart uploads: the client helper only sets `Content-Type: application/json` if body is not `FormData`—use `FormData` for attachments (see `api/src/routes/attachments.ts`).

## File map: where to look

- API entry: `api/src/server.ts` (JWT, CORS, rate limit, route registration, RLS preHandler).
- Auth flows: `api/src/routes/auth.ts` (+ `api/src/auth/argon.ts` for password hashing).
- Tickets domain: `api/src/routes/tickets.ts` (ETag/If-Match, watchers, assets, procs).
- SQL helpers: `api/src/sql.ts`, request-scoped connection: `api/src/db/sql.ts`, RLS helpers: `api/src/middleware/rls.ts`.
- Compose/services: `docker-compose.yml`, security overrides: `docker-compose.security.yml`.
- Schema/procs: top-level numbered `*.sql` files; run in order (idempotent).

## Practical examples

- New protected query inside a route handler:
  - Get `userId` from `request.user.sub` and use `withRls(userId, ...)` or the request’s SQL connection via `getRequestFromContext(request)`.
- UI calling tickets API:
  - `apiFetch('/tickets')` → attaches bearer from `opsgraph_token` and handles 401 redirect.

Tips for agents
- Prefer existing utilities (Zod, withRls, request SQL connection) instead of ad-hoc DB code.
- Keep `/api` prefix and align response shapes with existing routes.
- When touching tickets, preserve ETag/If-Match behavior and watcher/asset side-effects implemented via stored procs.
