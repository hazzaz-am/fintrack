## 1. Repo config

- [x] 1.1 Add `Dockerfile` (oven/bun base image): install deps with `bun install --frozen-lockfile`, run `bunx prisma generate`, run `bun run build`, start with `next start -p ${PORT:-3000}`. Verified locally: `docker build` succeeds and the container serves `/login` with HTTP 200 on a custom `$PORT`.
- [x] 1.2 Add `.dockerignore` excluding `node_modules`, `.next`, `.git`, `.env*`, `tests`, and other dev-only artifacts from the build context.
- [x] 1.3 ~~Add `railway.json`~~ — dropped. Config as Code opt-in closed for new services on 2026-08-28 (confirmed against current Railway docs); this service can't use it, so build/deploy settings are configured directly in the dashboard UI instead (task 2.x).

## 2. Railway project setup

- [x] 2.1 Create a new Railway project and service linked to the GitHub repo.
- [x] 2.2 Set Builder = Dockerfile, Dockerfile Path = `Dockerfile`, Custom Start Command = blank (uses the Dockerfile's `CMD`), Serverless = off (must stay always-on — a single persistent process, not scale-to-zero).
- [x] 2.3 Set Pre-Deploy Command (dashboard field, separate from Custom Start Command) = `bunx prisma migrate deploy`.
- [x] 2.4 Add a Postgres plugin to the project.
- [x] 2.5 Set `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the app service (Railway variable reference).
- [x] 2.6 Generate a fresh production `SESSION_SECRET` (distinct from the local dev value) and set it on the app service.
- [x] 2.7 Set `NODE_ENV=production` on the app service.
- [x] 2.8 Enable auto-deploy on push to `main`; "Wait for CI" left unchecked (no GitHub Actions workflows exist in this repo).

## 3. Verify

- [x] 3.1 Trigger a deploy and confirm the pre-deploy command applies all 5 existing migrations successfully.
- [x] 3.2 Confirm the app boots and is reachable over HTTPS on the Railway-provided domain.
- [x] 3.3 Register a test account and log in; confirm the session cookie has the `secure` flag set (production `NODE_ENV`).
- [x] 3.4 Confirm repeated failed login attempts are rate-limited (in-memory limiter working within the single instance).
