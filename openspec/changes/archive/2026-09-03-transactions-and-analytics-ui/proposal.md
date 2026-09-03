## Why

Three archived changes (`core-financial-architecture`, `investment-tracking`, `web-app-foundation`) already shipped complete, tested backends for accounts, transactions, savings goals, investments, and categories — but only Accounts has a screen. `nav-config.ts` has `enabled: false` placeholders for Dashboard, Transactions, Income, Expenses, Reports (and Savings Goals, Investments, Settings) waiting on exactly this follow-up work. Without a Transactions screen there is no way to record income, expenses, or transfers at all, which means every other screen that reports on that data — Dashboard, Income, Expenses, Reports — has nothing real to show. This change builds that whole dependent cluster together, and in doing so resolves an ambiguity in the PRD: it independently describes a "category breakdown" view four times (§14/§15 Expense Analytics/Visualization, §26.4 Expenses, §26.5 Income, §23 Reports), which would become four independently-written, drift-prone queries if built naively. This change introduces one shared `AnalyticsService` capability that all four screens consume instead.

## What Changes

- Add a Transactions screen (`(app)/transactions`): a searchable, sortable, paginated, filterable ledger table (Date/Account/Description/Category/Type/Amount per PRD §26.3) with edit/delete, backed by the existing `TransactionService.list`. Add forms to record Income, Expense, and Transfer transactions, backed by the existing `TransactionService` (`recordTransfer`) and account/category services. This is the one screen in this change that owns row-level create/edit/delete for transactions.
- Add a new `AnalyticsService` capability exposing category/source-grouped aggregation (sum of transaction amounts grouped by category, scoped by transaction type and date range) that extends rather than duplicates the existing `TransactionService.getSummary` (flat income/expense/net-cash-flow totals). This is the shared foundation Income, Expenses, Dashboard, and Reports are all built on.
- Add an Income screen (`(app)/income`) and an Expenses screen (`(app)/expenses`): thin, type-scoped analytics views (totals, source/category breakdown chart, trend over time) built on `AnalyticsService` and `TransactionService.getSummary`. Neither screen owns its own editable transaction table — editing and deleting transactions stays exclusively on the Transactions screen, so there is exactly one place in the product that mutates transaction rows.
- Add a Dashboard screen (`(app)/dashboard`) composing existing reads (`TransactionService.getSummary`, `AccountService.listWithBalances`, `InvestmentService.getTotals`, `InvestmentService.getUpcomingMaturities`, `TransactionService.list` for "Recent Transactions") plus the new `AnalyticsService` breakdown for its expense-by-category chart. Savings Rate is derived client/server-side from `getSummary`'s income/expense figures — no new query. Savings Goals are not summarized on the dashboard in this change, since Savings Goals UI is out of scope here.
- Add a Reports screen (`(app)/reports`) positioned as the cross-type, multi-period synthesis view: Monthly Financial Summary (income + expense + net savings + savings rate + top expense category in one place), Account Balance Report (reuses `AccountService.listWithBalances`), and Investment Report (reuses existing `InvestmentService` totals/maturities). Reports does not re-derive its own single-type category breakdown — it reuses `AnalyticsService`, resolving the redundancy between PRD §23's "Expense/Income Breakdown" and the Expenses/Income screens' own charts.
- Update `nav-config.ts`: flip `enabled: true` for Transactions, Income, Expenses, Dashboard, and Reports. Savings Goals, Investments, and Settings remain `enabled: false` — unaffected by this change.

## Capabilities

### New Capabilities
- `transactions-ui`: the Transactions screen — ledger table (search/sort/filter/paginate/edit/delete) and the record-income/record-expense/record-transfer interactions.
- `analytics`: shared category/source-grouped aggregation over transactions, scoped by type and date range; the backend foundation Income, Expenses, Dashboard, and Reports consume.
- `income-ui`: the Income screen — totals, income-source breakdown chart, trend over time. No row-level editing.
- `expenses-ui`: the Expenses screen — totals, expense-category breakdown chart, trend over time. No row-level editing.
- `dashboard-ui`: the Dashboard screen — composed top-line financial overview (balance, income/expense/net cash flow, savings rate, investment totals, expense-by-category chart, upcoming investment maturities, recent transactions).
- `reports-ui`: the Reports screen — Monthly Financial Summary, Account Balance Report, Investment Report.

### Modified Capabilities
(none — `web-app-shell`'s existing requirement, "Sidebar navigation reflects the full product structure," already specifies that a module's nav link becomes enabled once its screen exists; this change satisfies that requirement for five modules without changing the requirement itself.)

## Impact

- **New code**: `src/app/(app)/transactions`, `src/app/(app)/income`, `src/app/(app)/expenses`, `src/app/(app)/dashboard`, `src/app/(app)/reports`, plus `src/lib/services/analytics-service.ts` and any new Server Action modules wrapping `TransactionService`/`AnalyticsService` for these screens' mutations.
- **Modified**: `src/app/(app)/nav-config.ts` (five items flip to `enabled: true`).
- **Unchanged**: every existing method on `TransactionService`, `AccountService`, `InvestmentService`, `SavingsGoalService`, `CategoryService`, the Prisma schema, and all existing `src/app/api/**` route handlers keep their exact existing behavior — this change reads from existing services (adding one new service, `AnalyticsService`) and does not modify backend business logic. `TransactionService` gains one new, additive method, `listPaginated` (search/sort/pagination via the database, for the ledger table), alongside its existing `list`/`getSummary`/etc., which are untouched.
- **Out of scope**: Savings Goals UI, Investments UI (both independent and backend-ready — a separate change), Settings screen, recurring transactions (Phase 2), budgets (Phase 2), CSV import/export.
