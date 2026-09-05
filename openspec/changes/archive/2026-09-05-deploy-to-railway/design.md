## Context

FinTrack currently only runs locally: Postgres via `docker-compose.yml` on port 5555, no Dockerfile, no hosting config, no production secrets. The codebase already implies a specific deployment shape rather than leaving it open:

- `src/lib/auth/rate-limit.ts` uses an in-memory `Map` and its own comment says it's "sufficient for a single-instance hobby deployment; would need a shared store (Redis) behind a load balancer."
- `src/lib/auth/session.ts` uses stateless HMAC-signed cookies (no DB session lookup) — serverless-friendly on its own, but doesn't change the rate-limiter constraint above.
- `@node-rs/argon2` (password hashing) is a native Rust/NAPI binding — requires a full Node.js runtime, incompatible with edge/isolate runtimes (e.g. Cloudflare Workers, Vercel Edge functions).
- 5 Prisma migrations exist under `prisma/migrations/` and have only ever been applied to a local database.
- FinTrack's PRD explicitly scopes it as a personal/hobby/portfolio project, single user, BDT-denominated — not a multi-tenant SaaS needing horizontal scale.

## Goals / Non-Goals

**Goals:**
- Get FinTrack running in production reachable over HTTPS, with zero code changes required.
- Production database with migrations applied and matching the current Prisma schema.
- Secrets (`SESSION_SECRET`) distinct from local dev values.
- Deploys triggered by pushing to `main`.

**Non-Goals:**
- Horizontal scaling, multi-instance rate limiting, or Redis — explicitly deferred; would only matter if this stopped being a single-user hobby app.
- Custom domain setup — mechanical, decided at implementation time, not an architectural decision.
- File/attachment storage — `attachment.tsx` is UI-only today; no server-side storage exists to provision for.
- CI gating (tests/lint) before deploy — not addressed by this change.

## Decisions

### 1. Railway over Render or Fly.io
All three support Node.js/bun apps with a release-command hook for `prisma migrate deploy`. The deciding factors for a **daily-use personal app**:
- Render's free tier sleeps the service after 15 minutes idle — every check-in would eat a cold-start; avoiding that requires a paid instance (~$7/mo) with no material benefit over Railway.
- Fly.io requires managing its own Dockerfile, `fly.toml`, and self-run "Fly Postgres" — more operational surface than a single-user hobby project needs.
- Railway never sleeps and offers managed Postgres as a one-click plugin in the same project — least ceremony for the value delivered.

**Correction from initial exploration**: Railway's zero-config builder (Railpack, successor to Nixpacks) does **not** auto-detect Bun projects — Railway's own docs say a Dockerfile is required for Bun apps. Verified via Context7 against current Railway docs during implementation. This means a Dockerfile is needed regardless of platform choice (Render/Fly.io would need one too), so it doesn't change the Railway-vs-alternatives conclusion — it only corrects the "no Dockerfile needed" assumption from the design's initial pass.

### 2. Railway-managed Postgres plugin over external managed Postgres (Neon/Supabase)
Keeping the database in the same Railway project means one bill, same-region networking (lower latency), and `DATABASE_URL` auto-injected into the app service with no manual copy-paste of connection strings. The trade-off — coupling the DB to this specific host, making a future host switch slightly more work — was accepted since there's no current plan to move off Railway.

### 2b. Build/deploy settings live in the Railway dashboard UI, not `railway.json`
Initially added a `railway.json` (Config as Code) for build/pre-deploy settings. Discovered during implementation that Railway closed Config as Code opt-in for new services on 2026-08-28 (this service was created after that date) — the file is silently inert for us. Removed it; the same settings (Builder=Dockerfile, Dockerfile Path, Pre-Deploy Command, Serverless=off) are set directly as dashboard fields on the service instead. No functional difference, just a different place the config lives — and one not captured in the repo, since Railway's dashboard is the source of truth here, not source control.

### 3. `prisma migrate deploy` as a release step, not `db push`
`migrate deploy` applies the existing versioned migration history exactly, and fails loudly if a migration can't apply — appropriate for a real (if small) production database. `db push` would silently diverge from the migration history that already exists locally.

### 4. Rotate `SESSION_SECRET` for production rather than reuse the local dev value
The dev value in `.env` is gitignored (never leaked to the repo) but has been visible in local shell/tooling contexts; generating an independent, higher-entropy value for production costs nothing and removes any dependency on the dev value staying private.

## Risks / Trade-offs

- **[Risk]** No CI/test gate before deploy means a broken `main` push deploys directly. → **Mitigation**: out of scope for this change, but flagged as a natural follow-up once the app has more automated test coverage to gate on.
- **[Risk]** Coupling the database to Railway (Decision 2) makes migrating to a different host later slightly more involved (must export/import the DB separately). → **Mitigation**: accepted trade-off; Railway Postgres is still just Postgres, so a `pg_dump`/`pg_restore` migration path remains available if needed.
- **[Trade-off]** No Redis-backed rate limiting means the limiter resets on every deploy/restart (in-memory state is lost). → **Mitigation**: acceptable for a single-user hobby app; explicitly the same trade-off already accepted in the existing code comment.

## Open Questions

- Custom domain vs. Railway's free `*.up.railway.app` subdomain — left to implementation time, doesn't affect architecture (`session.ts`'s `sameSite: "lax"` cookie works under either).
- Whether to connect Railway directly to the GitHub repo for auto-deploy-on-push, or deploy manually via the Railway CLI for tighter control over when production changes — left to implementation time.
