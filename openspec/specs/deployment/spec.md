## Purpose

Defines the production hosting shape for FinTrack: a single always-on Node.js process (not ephemeral/multi-instance serverless), the migration-before-traffic release sequence, and the environment variables the production deployment must set explicitly. These requirements capture constraints the app's existing code already imposes (in-memory rate limiting, native auth bindings) on any hosting choice.

## Requirements

### Requirement: Single persistent process
The production deployment SHALL run the app as one always-on Node.js process rather than ephemeral or multi-instance serverless functions, since the app's session handling and rate limiting assume in-process state shared across requests.

#### Scenario: Rate limiting stays meaningful across requests
- **WHEN** multiple login attempts are made in quick succession from the same client
- **THEN** they are all evaluated against the same in-memory rate-limit bucket, because they are handled by the same running process

#### Scenario: Native auth bindings load correctly
- **WHEN** the app starts in production
- **THEN** it runs under a full Node.js runtime (not an edge/isolate runtime), so the native `@node-rs/argon2` binding loads without error

### Requirement: Migrations run before the app serves traffic
Each deploy SHALL run `prisma migrate deploy` against the production database and complete successfully before the app begins accepting requests.

#### Scenario: Deploying a new migration
- **WHEN** a deploy includes a new file under `prisma/migrations/`
- **THEN** that migration is applied to the production database before the app process starts serving requests

#### Scenario: Migration failure blocks release
- **WHEN** `prisma migrate deploy` exits with a non-zero status
- **THEN** the deploy SHALL NOT proceed to start the app on the new version

### Requirement: Production environment variables are set explicitly
The production environment SHALL define `DATABASE_URL`, `SESSION_SECRET`, and `NODE_ENV=production`, and `SESSION_SECRET` SHALL be a value distinct from any value used in local development.

#### Scenario: Session cookie is marked secure
- **WHEN** a user logs in against the production deployment
- **THEN** the session cookie is set with the `secure` flag, because `NODE_ENV` is `production`

#### Scenario: Production session secret is not the dev secret
- **WHEN** the production `SESSION_SECRET` value is compared to the value in the local `.env` file
- **THEN** they are different values
