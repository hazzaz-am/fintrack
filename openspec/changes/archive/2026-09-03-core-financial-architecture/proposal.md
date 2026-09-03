## Why

FinTrack has no backend, database, or auth yet — only a scaffolded Next.js 16 app with the shadcn/ui component set installed. Before any UI is wired up, the foundational data model needs to be settled, because the PRD's own accounting rules (§29: transfers aren't income, allocation doesn't touch balance, investment principal isn't income) only hold automatically if the architecture treats `Transaction` as the single source of truth ledger and derives everything else — account balance, goal allocation totals — from it at read time. Building account balance and goal allocation as independently-mutated fields first would work for a demo but would require a painful rewrite later to get consistency and history right. This change establishes that ledger-first foundation and the first four build stages from PRD §45 (Foundation, Accounts, Transactions, Analytics) on top of it.

## What Changes

- Add user registration, login, logout with Argon2/bcrypt password hashing and secure session-based authentication.
- Add per-`userId` authorization checks on every user-owned resource (accounts, transactions, categories, goals).
- Add `Account` CRUD (create, edit, archive) with **no stored balance column** — balance is always computed via aggregation: `openingBalance + income − expenses + incoming transfers − outgoing transfers`.
- Add `Category` CRUD (income/expense type, default seeded categories, custom categories, optional parent category).
- Add `Transaction` CRUD supporting three types — Income, Expense, Transfer — with transfers implemented as a single atomic operation across two accounts that never touches income/expense totals.
- Add date-range filtering and basic monthly aggregation (Stage 4: Analytics) computed via database aggregation, not client-side summation.
- Add `SavingsGoal` CRUD and **ledger-based allocation**: `GoalAllocationEvent` is an append-only ledger (never a mutable "current allocated" field); current allocated amount is always `SUM(events)`. Moving an allocation between goals is two ledger events, not an overwrite.
- Enforce the allocation-vs-balance invariant at allocation-creation time only (hard block if it would exceed unallocated balance); a later edit to a past transaction that retroactively drops balance below already-allocated totals is allowed, surfaced instead as a non-blocking "over-allocated" warning state.
- Establish the layered architecture (route handlers → services → data access → PostgreSQL) inside the single Next.js codebase — no separate backend service.

**Out of scope for this change** (deferred to a follow-up): Investment tracking (PRD §16-20), the full Dashboard aggregation page (PRD §7, build Stage 7), recurring transactions, budgets, reports, data export/import, net worth.

## Capabilities

### New Capabilities
- `user-auth`: Registration, login, logout, session management, password hashing, and per-resource authorization.
- `accounts`: Account CRUD and derived-balance computation from the transaction ledger.
- `categories`: Income/expense category CRUD, default categories, custom categories.
- `transactions`: Income/Expense/Transfer CRUD, transfer atomicity, date-range filtering, and monthly aggregation.
- `savings-goals`: Savings goal CRUD and ledger-based allocation of account funds to goals, including the allocation-vs-balance invariant.

### Modified Capabilities
- None — this is the first change in the project; no existing specs to modify.

## Impact

- **New dependencies**: PostgreSQL, Prisma (ORM + migrations), Zod (validation), a password-hashing library (Argon2 or bcrypt), a session/auth library (Auth.js or custom).
- **New code**: `prisma/schema.prisma`; `src/lib/services/` (AccountService, TransactionService, CategoryService, SavingsGoalService, AuthService); `src/app/api/**` or Server Actions for each capability; `src/lib/auth/` (session handling, middleware for per-user authorization).
- **No changes to existing code** — the repo currently has no backend, so this is purely additive to `src/app/page.tsx`/`layout.tsx` aside (those become the shell that later UI work builds into).
- **Follow-up changes implied**: an `investments` change, a `dashboard` change aggregating all capabilities, and later `recurring-transactions`, `budgets`, `reports`, `net-worth` per PRD §36-38.
