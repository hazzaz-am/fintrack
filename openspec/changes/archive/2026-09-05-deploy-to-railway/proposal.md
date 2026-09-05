## Why

FinTrack has no production deployment target — it only runs locally against a docker-compose Postgres instance, and there's no Dockerfile, hosting config, or documented environment-variable/migration plan. The app is ready to make usable outside a local dev machine, and its own code already assumes a specific deployment shape: a single persistent Node.js process (in-memory rate limiter, stateless HMAC-signed cookie sessions, native `@node-rs/argon2` bindings that require the Node.js runtime, not edge). Railway matches that shape with effectively no code changes, unlike serverless platforms (Vercel) where ephemeral multi-instance functions would silently break the in-memory rate limiter.

## What Changes

- Deploy FinTrack to Railway as a single always-on service. Railway's zero-config builder (Railpack) does not auto-detect Bun projects, so add a Dockerfile (`oven/bun` base image) to build and run the app.
- Provision a Railway-managed Postgres plugin in the same project; Railway auto-injects `DATABASE_URL` into the app service.
- Add a release step that runs `prisma migrate deploy` against the 5 existing migrations before the app starts serving traffic (the current migration history has never been applied outside local dev).
- Generate a fresh, production-only `SESSION_SECRET` (distinct from the local dev value) and set it as a Railway environment variable.
- Set `NODE_ENV=production` so the session cookie's `secure` flag activates.
- Connect the GitHub repo for auto-deploy on push to `main` (mechanical Railway setting, not a design decision).
- **Out of scope**: custom domain configuration, Redis-backed rate limiting or multi-instance scaling, file/attachment storage (no server-side file storage exists yet — `attachment.tsx` is UI-only), and CI test/lint gating before deploy.

## Capabilities

### New Capabilities
- `deployment`: production hosting shape (single persistent process on Railway), required environment variables, migration-on-deploy behavior, and the constraints the app's existing code already imposes on any hosting choice (Node.js runtime required, single-instance assumption for rate limiting).

### Modified Capabilities
(none — this is purely additive infrastructure; no existing capability's requirements change)

## Impact

- **Code**: none required to the app itself. The app's auth/session/rate-limit implementation already fits this deployment shape as-is.
- **New files**: `Dockerfile`, `.dockerignore`. Build/deploy settings (builder, Dockerfile path, pre-deploy command, always-on/no-serverless) live in the Railway dashboard UI, not a repo config file — Railway's Config as Code (`railway.json`) closed new-service opt-in on 2026-08-28.
- **New config**: Railway project + service settings, Railway Postgres plugin, environment variables (`DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`).
- **Dependencies**: none added.
- **Operational**: this is the first production deployment, so it also establishes the baseline for how migrations, secrets, and env vars are managed going forward.
