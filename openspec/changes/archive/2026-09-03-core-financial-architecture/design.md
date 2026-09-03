## Context

The repo is a fresh Next.js 16 / React 19 / Tailwind 4 scaffold with the full shadcn/ui component set already installed (`src/components/ui/**`) but no database, ORM, auth, or backend code. The PRD (`Product Requirements Document — Personal Finance Tracker.md`) describes a single-user personal finance tracker where the product's core promise — answering "how much money do I have, where is it, what's it for" — depends on account balances and goal allocations always being consistent with the underlying transaction history. The PRD itself flags this as the interesting engineering problem (§42: "Balances should be derived from transactions rather than manually changed in multiple places") but its own data model sketch (§28) still lists `openingBalance` alongside implicit "balance" fields in mockups, and leaves the backend architecture (§33) as an open choice between Next.js-only and a separate NestJS API. This document resolves those open points before schema or code is written.

## Goals / Non-Goals

**Goals:**
- Establish `Transaction` as the single append-only source of truth for money movement; derive account balances and goal allocation totals from it rather than storing redundant state.
- Define the concrete Prisma schema, service layer boundaries, and request flow for auth, accounts, categories, transactions, and savings goals (PRD §45 Stages 1–4).
- Make the PRD §29 accounting rules (transfers aren't income/expense, allocation doesn't touch balance, transfer atomicity) structural properties of the model rather than rules each code path must remember to enforce.
- Keep the whole system inside the existing Next.js app (Route Handlers + Server Actions), with a services layer that could be extracted into a standalone API later without a rewrite.

**Non-Goals:**
- Investment tracking, dashboard aggregation page, recurring transactions, budgets, reports, CSV export/import, net worth — all deferred to follow-up changes.
- Multi-user sharing / collaborative accounts — explicit PRD non-goal (§4); auth here is per-user isolation, not team features.
- Query performance work beyond what's needed to hit the PRD §32 ~500ms target at hobby scale (single user, low thousands of transactions). No caching/materialized views in this change.

## Decisions

### D1 — Derived balance, not stored

**Decision:** `Account` has no `balance` column. Balance is computed at read time:

```
balance = openingBalance
        + SUM(amount WHERE type = INCOME, accountId = this)
        - SUM(amount WHERE type = EXPENSE, accountId = this)
        + SUM(amount WHERE type = TRANSFER, destinationAccountId = this)
        - SUM(amount WHERE type = TRANSFER, sourceAccountId = this)
```

Implemented as a single indexed aggregation query (Postgres `SUM(...) FILTER (WHERE ...)` in one pass over `Transaction` rows for that `accountId`), exposed via `AccountService.getBalance(accountId)` / `getBalances(userId)` for the multi-account case (one grouped query, not N+1).

**Alternatives considered:**
- *Stored, mutated column* — faster reads, but every transaction create/edit/delete/transfer must remember to update it in the same DB transaction; one missed path silently drifts the balance, which is the exact failure mode a finance app can't afford. Rejected.
- *Stored + reconciliation job* — stored column with a periodic recompute-and-diff job to catch drift. Adds operational complexity (a job scheduler) to catch a bug class that's avoided entirely by not storing the value. Rejected for this scale.

**Why now, not deferred:** switching from stored to derived after the UI is built means rewriting every write path that currently mutates balance directly. Cheaper to start correct.

### D2 — Ledger-based goal allocation

**Decision:** `GoalAllocationEvent { id, savingsGoalId, accountId, amount, note?, createdAt }`, append-only, amount can be negative (deallocation). Current allocated amount for a goal = `SUM(amount)` grouped by `savingsGoalId`; per-account contribution = grouped by `(savingsGoalId, accountId)`. "Move ৳4,000 from Marriage to Travel" is two rows: `(Marriage, accountX, -4000)` and `(Travel, accountX, +4000)`, written in one DB transaction.

**Alternatives considered:**
- *Mutable `GoalAllocation { savingsGoalId, accountId, amount }` row, upserted* — matches the PRD's literal §28 schema, simpler queries. But PRD §36 (Phase 2) wants "goal contribution history," which a mutable row cannot answer without a separate audit log bolted on later. Rejected — the ledger form is barely more code now and makes history free forever.

**Consequence:** `GoalAllocationEvent` is a second, smaller ledger alongside `Transaction`. Both follow the same pattern (append-only fact table, derived totals via aggregation) — this is the unifying architectural idea of the whole change, not two unrelated decisions.

### D3 — Soft invariant: allocation-vs-balance

**Decision:** Enforced at exactly one point — creating a new `GoalAllocationEvent` with positive amount. `SavingsGoalService.allocate()` computes the account's current unallocated balance (`balance − SUM(existing allocation events for that account)`) inside the same DB transaction as the insert, and rejects if the new amount would exceed it. No check runs on `Transaction` edit/delete.

Consequence: editing or deleting a past transaction can retroactively make `SUM(allocations) > balance` for an account. This is allowed. `AccountService`/`SavingsGoalService` read paths compute an `isOverAllocated` boolean (unallocated balance < 0) that the UI surfaces as a warning badge; no data is locked or blocked because of it.

**Alternatives considered:**
- *Block the transaction edit* — rejected: a user editing an unrelated transaction shouldn't be blocked by a goal-allocation side effect discovered three screens away; also ambiguous which of potentially several goals should "win."
- *Auto-shrink allocations proportionally on the triggering edit* — rejected: silently mutates user-entered allocation history without consent, defeats the point of the allocation ledger being a truthful record.

### D4 — Next.js-only architecture, layered internally

**Decision:** No separate NestJS service. Request flow:

```
UI (Server/Client Components)
    ↓
Route Handlers (src/app/api/**) or Server Actions — thin: parse+validate (Zod) → call service → shape response
    ↓
Services (src/lib/services/*.ts) — business logic, PRD §29 rules, orchestrates DB transactions
    ↓
Data access (Prisma Client, src/lib/db.ts) 
    ↓
PostgreSQL
```

Services are the enforcement point for every accounting rule and the only layer allowed to call Prisma directly for these capabilities — route handlers/Server Actions never construct Prisma queries themselves. This keeps the "layered architecture" portfolio value (PRD §34, §41) visible in the codebase without a second deployable, and keeps the door open to extracting services behind a real API later (e.g., a NestJS service could import the same service classes with minimal change) if that's ever wanted.

**Alternatives considered:** Separate NestJS API (PRD §33 Option B) — more visible "API design" surface for a portfolio, but roughly doubles deployment/auth-wiring/CORS complexity for a solo hobby project whose primary success metric (§43) is a working product, not a specific architecture. Rejected for this change; revisit only if the project's goals shift toward "distributed systems" as the primary showcase.

### D5 — Auth: real per-user isolation, no sharing

**Decision:** Session-based auth (signed, httpOnly, secure cookie) rather than JWT-in-localStorage, to avoid XSS-exposed tokens (PRD §31). Passwords hashed with Argon2id. Every service method that reads/writes a user-owned row takes the authenticated `userId` and includes it in the `WHERE` clause (never trust a resource ID alone) — enforced by a lint-able convention: every Prisma query in `src/lib/services/*` for these five capabilities must filter or scope by `userId`.

**Alternatives considered:** Skipping real auth / hardcoding a single user — faster to build, but authz-per-resource is explicitly called out as portfolio value (PRD §41) and isn't much extra work over hardcoding; rejected in favor of doing it for real. Full team/sharing model — explicit non-goal (PRD §4); rejected.

## Data Model (this change)

```
User { id, name, email (unique), passwordHash, defaultCurrency, createdAt, updatedAt }

Account { id, userId, name, institution, type, openingBalance (Decimal), currency, status, createdAt, updatedAt }
  -- no balance column; see D1

Category { id, userId, name, type[INCOME|EXPENSE], parentCategoryId?, icon?, createdAt }

Transaction { id, userId, accountId, categoryId? (null for TRANSFER), type[INCOME|EXPENSE|TRANSFER],
              amount (Decimal, positive), description, transactionDate, 
              sourceAccountId? , destinationAccountId?, -- populated only for TRANSFER; accountId unused for TRANSFER rows
              createdAt, updatedAt }

SavingsGoal { id, userId, name, targetAmount (Decimal), targetDate?, status, description?, createdAt, updatedAt }

GoalAllocationEvent { id, savingsGoalId, accountId, amount (Decimal, signed), note?, createdAt }
  -- see D2; append-only
```

Notes:
- `Transaction.amount` is always stored positive; sign/direction comes from `type` (+ `sourceAccountId`/`destinationAccountId` for transfers). Avoids the classic bug of a negative expense amount silently double-negating in aggregation.
- All monetary columns are `DECIMAL(14,2)` (or currency-appropriate precision), never `FLOAT`/`DOUBLE` — PRD Rule 5 (§29).
- Transfers are one `Transaction` row (`type = TRANSFER`) with both `sourceAccountId` and `destinationAccountId` set, not two linked rows — keeps the atomicity guarantee to "one row insert" rather than needing a wrapping DB transaction across two rows (though the service still wraps balance-check + insert in a transaction for safety with concurrent writes).

## Risks / Trade-offs

- **[Risk]** Aggregation queries for balance get slower as transaction volume grows → **Mitigation:** not a concern at hobby/portfolio scale (low thousands of rows); if it ever matters, add a materialized/cached balance behind the same `AccountService.getBalance()` interface — callers don't change.
- **[Risk]** Ledger-only allocation model is a departure from the PRD's literal §28 `GoalAllocation` schema → **Mitigation:** documented here as an intentional, justified deviation (D2); the derived "current allocated amount" view matches every PRD-facing example (§9) exactly, only the storage shape differs.
- **[Risk]** Soft invariant (D3) means the UI must actively check and display "over-allocated" state, or the inconsistency is invisible → **Mitigation:** `isOverAllocated` is a first-class field returned by `SavingsGoalService`/`AccountService` read methods, not an afterthought the UI has to compute itself.
- **[Trade-off]** Single Next.js deployable is less impressive as a "distributed systems" portfolio artifact than a separate API service → accepted; §41's portfolio value list is satisfied by layered code structure and doesn't require a second process.

## Migration Plan

Greenfield — no existing data or schema. Steps:
1. Add PostgreSQL connection + Prisma; commit initial `prisma/schema.prisma` per Data Model above; run first migration.
2. Build `src/lib/services/` in dependency order: `AuthService` → `AccountService` → `CategoryService` → `TransactionService` → `SavingsGoalService` (matches PRD §45 Stages 1–5, minus UI).
3. Wire Route Handlers/Server Actions per capability, each calling only its service.
4. No rollback concerns beyond standard Prisma migration rollback (`prisma migrate resolve`), since there's no production data yet.

## Open Questions

- Should `Category` support user-level default-category seeding on registration (PRD §12 lists defaults), or ship defaults as a shared read-only set filtered into every user's list at query time? Leaning toward seed-on-registration (simpler queries, user can then edit/delete their copy) but not required for this change to proceed — can be decided during `categories` implementation.
- Multi-currency (`Account.currency` field exists per PRD §28, but multi-currency support is Phase 3, §37): should account balance aggregation for a user simply assume single-currency for MVP and ignore/warn on mismatched currencies? Recommend: assume single currency for MVP, defer real handling to the Phase 3 multi-currency change — not blocking for this change since it only affects Accounts/Transactions within this scope.
