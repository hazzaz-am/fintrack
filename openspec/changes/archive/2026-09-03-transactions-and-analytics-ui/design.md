## Context

Continuing the numbering from the three archived design docs (`core-financial-architecture` D1–D5, `investment-tracking` D6–D9, `web-app-foundation` D10–D14), which established: append-only ledgers with derived state (D1, D2, D6, D7), services as the sole enforcement point for business rules (D4), the Server-Component-reads / Server-Action-writes pattern (D10, D11), and semantic color as a mapping onto service-computed fields (D13). This design covers the five screens that turn those backends into a usable product: Transactions, Income, Expenses, Dashboard, Reports.

The proposal already made the one product-shaping call this design has to build on: Income and Expenses are read-oriented, type-scoped analytics views, not a second and third place to edit transactions — Transactions owns that exclusively. This design works out what that implies structurally, plus the shared aggregation layer (`AnalyticsService`) all five screens sit on.

`TransactionService.getSummary(userId, range)` already exists (flat income/expense/netCashFlow via one raw-SQL query for a date range). Nothing existing groups by category or buckets by month — every screen in this change needs at least one of those two shapes.

## Goals / Non-Goals

**Goals:**
- One shared aggregation service (`AnalyticsService`) that Income, Expenses, Dashboard, and Reports all call for their breakdown/trend charts — never four independent `groupBy` queries invented per-screen.
- One shared date-range resolution so "this week/month/year/custom range" (PRD §14, §22) is computed identically everywhere it appears, not reimplemented per screen.
- Transactions remains the single place transaction rows are created, edited, or deleted; every other screen in this change is read-only with respect to transaction data, linking back to Transactions for mutation.
- Reuse existing services (`AccountService`, `InvestmentService`) for Dashboard/Reports content that isn't transaction-shaped — no parallel totals logic.

**Non-Goals:**
- Savings Goals UI, Investments UI, Settings — independent, out of scope for this change (see proposal).
- Recurring transactions, budgets, CSV export — Phase 2 (PRD §36), not touched here.
- Net Worth calculation (PRD §24) — needs a liability concept that doesn't exist yet; not attempted on Dashboard/Reports in this change.
- Category-breakdown/trend query performance work beyond what's adequate at hobby scale (PRD §32's ~500ms, dev-scale target) — flagged as a risk, not solved here.

## Decisions

### D15 — `AnalyticsService` is a new service with two functions, both Prisma `groupBy`, not raw SQL

**Decision:** Add `src/lib/services/analytics-service.ts` with:
- `getCategoryBreakdown(userId, type: 'INCOME' | 'EXPENSE', range)` — `prisma.transaction.groupBy({ by: ['categoryId'], where: { userId, type, transactionDate: {gte, lte} }, _sum: { amount: true } })`, then joined against category names (categories are always present for `INCOME`/`EXPENSE` rows — the DB CHECK constraint already guarantees this).
- `getMonthlyTrend(userId, range)` — income and expense totals bucketed by month within `range`, for the Income-vs-Expenses bar chart and Expense Trend line chart (PRD §15). Implemented as one query grouping by a truncated month, mirroring `getSummary`'s conditional-sum shape but per-bucket rather than a single row.

`getSummary` is untouched — it stays the single-row, whole-range total every screen still needs for its top-line numbers; `AnalyticsService` only adds the two grouped shapes nothing currently provides.

**Alternatives considered:**
- *Add these as more methods on `TransactionService`* — rejected: `TransactionService` is CRUD + one flat summary; grouped analytical aggregation is a distinct concern the PRD itself names as its own service boundary (§34: `AnalyticsService`/`ReportingService`). Keeping it separate also means Income/Expenses/Dashboard/Reports depend on an analytics-only service, not the full transaction-mutation surface.
- *Raw SQL like `getSummary`* — rejected for `getCategoryBreakdown`/`getMonthlyTrend`: `getSummary`'s raw query exists to compute three conditional sums in one row in one round trip; grouped aggregation is exactly what Prisma's `groupBy` is for, with no CASE-expression trickery needed. Raw SQL only if `groupBy` proves insufficient (see Risks).

**Consequence:** Every screen with a category or time-bucketed chart (Income, Expenses, Dashboard's expense-by-category widget, Reports) depends on `AnalyticsService`, never rederives grouping logic itself.

### D16 — One shared date-range resolver, not five ad-hoc ones

**Decision:** Add a pure function (no DB access) — `resolveDateRange(period: 'day'|'week'|'month'|'year'|'custom', custom?: {from, to}): {from: Date, to: Date}` in `src/lib/date-range.ts`. Transactions' filter bar, Income/Expenses' period selector, Dashboard's implicit "this month," and Reports' Monthly Financial Summary period picker all call this instead of each computing period boundaries independently. Services never see the string `period` — only ever a resolved `{from, to}`, matching `getSummary`'s existing signature.

**Alternatives considered:**
- *Each screen computes its own range* — the PRD lists "day/week/month/year/custom" as filter dimensions in three separate places (§14, §22, and implicitly the Dashboard's "this month"); computing this five times risks the same kind of drift the `AnalyticsService` decision (D15) is avoiding for aggregation, just one layer up in the UI.

**Consequence:** Timezone/week-start/month-boundary edge cases get solved exactly once.

### D17 — Income and Expenses show a read-only, type-filtered recent-transactions list, not their own table

**Decision:** Income/Expenses screens include a "recent transactions" section (satisfying PRD §26.5's "Salary history" / general recency need) that renders the same read-only row presentation Dashboard's "Recent Transactions" widget uses, filtered to `type = INCOME` / `EXPENSE` respectively. Rows are not editable in place; each links to `/transactions?...` (pre-filtered to that row) where the existing edit/delete affordance lives. A shared `<RecentTransactionsList>` (read-only) component backs all three surfaces (Income, Expenses, Dashboard) so "what a transaction row looks like when you can't edit it" is defined once.

For quickly adding a transaction while on Income/Expenses/Dashboard (a real gap if these screens are otherwise 100% read-only), a shared `<RecordTransactionDialog>` component — the same one Transactions uses for its "record income/expense" action — is available from all four screens via a persistent "+ Add Transaction" action, calling the same Server Action. This is UI reuse only; the mutation, validation, and service call are unchanged and still belong exclusively to the `transactions-ui` capability.

**Alternatives considered:**
- *Income/Expenses are pure charts, no transaction list at all* — rejected: drops PRD §26.5's "Salary history" requirement and makes the screens feel disconnected from the data they're summarizing.
- *Income/Expenses get their own inline edit/delete, duplicating Transactions* — rejected per the proposal's core resolution: two independent places to mutate the same rows is exactly the drift risk (§29 rules, D1-style derived-state precedent) this whole change is designed to avoid.

**Consequence:** Exactly one component owns editable transaction rows (Transactions' table); exactly one component owns read-only transaction rows (`<RecentTransactionsList>`), reused everywhere else.

### D18 — Reports is one page with three sections, not three sub-routes

**Decision:** `/reports` renders Monthly Financial Summary, Account Balance Report, and Investment Report as three sections (tabs or stacked cards — a UI-polish call, not an architectural one) on a single route. Monthly Financial Summary's "Top Expense Category" is derived by taking the max from `AnalyticsService.getCategoryBreakdown(userId, 'EXPENSE', range)`'s result — not a separate query. Account Balance Report reuses `AccountService.listWithBalances()` as-is; Investment Report reuses `InvestmentService.getTotals()`/`getUpcomingMaturities()`/`listWithPrincipal()` as-is.

**Alternatives considered:**
- *Separate routes per report (`/reports/monthly`, `/reports/accounts`, `/reports/investments`)* — more scalable if Phase 2 grows the report catalog significantly, but three server-rendered sections that each call one or two already-existing service functions don't need route-level isolation yet. Revisit if Reports grows past what one page comfortably holds.

**Consequence:** Reports has no new aggregation logic of its own beyond composing three existing sources (`AnalyticsService`, `AccountService`, `InvestmentService`) — it is a synthesis screen, not a fourth place that computes category breakdowns.

## Risks / Trade-offs

- **[Risk]** Neither `categoryId` nor `(userId, type, transactionDate)` has a dedicated index — `getCategoryBreakdown`/`getMonthlyTrend` will do a filtered scan over `(userId, transactionDate)` (already indexed) plus a group-by pass → **Mitigation:** accepted at hobby/dev scale (PRD §32's own target is loose); add a composite index if/when real data volume makes it measurable. Not solved in this change.
- **[Risk]** Reusing `<RecordTransactionDialog>` across four screens (D17) could let screen-specific state leak into a component meant to be generic → **Mitigation:** the dialog only ever takes an optional default `type`/`accountId` as props and calls the one shared Server Action; no screen-specific business logic lives inside it.
- **[Trade-off]** Reports as one page (D18) means all three sections' data is fetched on every Reports visit, even if the user only wants one → accepted; each section's query is cheap (existing service calls plus one grouped query), and splitting into sub-routes prematurely would add route/navigation surface for no current benefit.

## Migration Plan

Additive only — no existing screens change behavior; `nav-config.ts` flips five `enabled` flags once each screen lands.
1. `src/lib/date-range.ts` (D16) — needed by every screen below.
2. `src/lib/services/analytics-service.ts` (D15) — needed by Income, Expenses, Dashboard, Reports.
3. `(app)/transactions`: ledger table + filters (using `resolveDateRange`) + `<RecordTransactionDialog>` (record income/expense/transfer) + edit/delete, all via Server Actions wrapping `TransactionService`.
4. `<RecentTransactionsList>` (read-only, shared) — needed by Income, Expenses, Dashboard.
5. `(app)/income`, `(app)/expenses`: totals + `AnalyticsService.getCategoryBreakdown` chart + `AnalyticsService.getMonthlyTrend` trend + `<RecentTransactionsList>` + `<RecordTransactionDialog>` quick-add.
6. `(app)/dashboard`: composes `getSummary`, `listWithBalances`, `InvestmentService.getTotals`/`getUpcomingMaturities`, `AnalyticsService.getCategoryBreakdown`, `<RecentTransactionsList>`, `<RecordTransactionDialog>`.
7. `(app)/reports`: three sections per D18.
8. `nav-config.ts`: flip `enabled: true` for Transactions, Income, Expenses, Dashboard, Reports.

## Open Questions

None outstanding — the two questions this design needed to settle (what Income/Expenses show without owning their own CRUD, D17; how Reports is structured, D18) are resolved above.
