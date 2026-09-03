## 1. Shared date-range resolver

- [x] 1.1 Create `src/lib/date-range.ts`: `resolveDateRange(period: 'day'|'week'|'month'|'year'|'custom', custom?: {from, to}): {from: Date, to: Date}` (design.md D16)
- [x] 1.2 Unit tests: each period type resolves correct boundaries; `custom` requires both `from`/`to`; month/year boundaries are correct at year edges

## 2. AnalyticsService

- [x] 2.1 Create `src/lib/services/analytics-service.ts`: `getCategoryBreakdown(userId, type, range)` using `prisma.transaction.groupBy` on `categoryId`, joined against category names (design.md D15)
- [x] 2.2 `getMonthlyTrend(userId, range)`: income and expense totals bucketed by month, including zero-total months in range
- [x] 2.3 Both functions scope to `userId` and exclude `TRANSFER`/`INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN` (spec: analytics)
- [x] 2.4 Unit tests: breakdown for a range with data, breakdown for a range with none (empty, not error), trend across a multi-month range including a zero-activity month, cross-user isolation

## 3. Transactions screen

- [x] 3.1 Build `src/app/(app)/transactions/page.tsx` as a Server Component, with search params driving filters (account/category/type/date range via `resolveDateRange`) and pagination — uses the new `TransactionService.listPaginated` (additive method; existing `list` is unchanged, see proposal.md Impact)
- [x] 3.2 Render the ledger table: date, account, description, category, type, amount; wire sort (date/amount) and search (description)
- [x] 3.3 Build empty state for zero transactions
- [x] 3.4 Create Server Actions: record income, record expense, record transfer (wrapping `TransactionService`/`recordTransfer`), update, delete — `revalidatePath` across every page that reads transaction data on success
- [x] 3.5 Build `<RecordTransactionDialog>` (shared component, design.md D17): tabs or a type selector for income/expense/transfer, accepts optional default `type`/`accountId` props
- [x] 3.6 Build edit-transaction form/dialog
- [x] 3.7 Build delete confirmation control
- [x] 3.8 Build `<RecentTransactionsList>` (shared, read-only component, design.md D17): renders a list of transactions with no edit/delete affordance, each row linking to `/transactions` filtered/highlighted to that row

## 4. Income screen

- [x] 4.1 Build `src/app/(app)/income/page.tsx`: period selector (`resolveDateRange`) + `TransactionService.getSummary` total + `AnalyticsService.getCategoryBreakdown('INCOME', range)` chart
- [x] 4.2 Add trend chart using `AnalyticsService.getMonthlyTrend`
- [x] 4.3 Add `<RecentTransactionsList>` filtered to `type = INCOME`
- [x] 4.4 Add quick-add action opening `<RecordTransactionDialog>` defaulted to `type = INCOME`
- [x] 4.5 Empty/zero state for a period with no income

## 5. Expenses screen

- [x] 5.1 Build `src/app/(app)/expenses/page.tsx`: period selector + `TransactionService.getSummary` total + `AnalyticsService.getCategoryBreakdown('EXPENSE', range)` chart
- [x] 5.2 Add trend chart using `AnalyticsService.getMonthlyTrend`
- [x] 5.3 Add month-over-month comparison indicator, derived from the trend data
- [x] 5.4 Add `<RecentTransactionsList>` filtered to `type = EXPENSE`
- [x] 5.5 Add quick-add action opening `<RecordTransactionDialog>` defaulted to `type = EXPENSE`
- [x] 5.6 Empty/zero state for a period with no expenses

## 6. Dashboard screen

- [x] 6.1 Build `src/app/(app)/dashboard/page.tsx` composing: `AccountService.listWithBalances`, `TransactionService.getSummary` (current month), `InvestmentService.getTotals`, `InvestmentService.getUpcomingMaturities`, `AnalyticsService.getCategoryBreakdown('EXPENSE', currentMonth)`, `TransactionService.listPaginated` (recent)
- [x] 6.2 Render top-line metric cards: total balance, income, expenses, net cash flow, savings rate (derived, zero-safe when income is zero), total invested, expected return
- [x] 6.3 Render account balance summary list
- [x] 6.4 Render expense-by-category chart
- [x] 6.5 Render upcoming investment maturities list
- [x] 6.6 Render `<RecentTransactionsList>` (unfiltered) + quick-add action opening `<RecordTransactionDialog>`

## 7. Reports screen

- [x] 7.1 Build `src/app/(app)/reports/page.tsx` with a period selector for the Monthly Financial Summary section (design.md D18)
- [x] 7.2 Monthly Financial Summary: income, expenses, net savings, savings rate, top expense category (derived from `AnalyticsService.getCategoryBreakdown` — max, omitted when no expenses)
- [x] 7.3 Account Balance Report section: `AccountService.listWithBalances`
- [x] 7.4 Investment Report section: `InvestmentService.getTotals`/`getUpcomingMaturities`/`listWithPrincipal`

## 8. Navigation

- [x] 8.1 Update `src/app/(app)/nav-config.ts`: flip `enabled: true` for Transactions, Income, Expenses, Dashboard, Reports
- [x] 8.2 Update root `src/app/page.tsx` redirect target from `/accounts` to `/dashboard` for authenticated users, now that Dashboard exists — also updated the two other authenticated-landing redirect sites (`(auth)/layout.tsx`'s already-logged-in guard, and `(auth)/actions.ts`'s post-login/register redirect) and the sidebar brand link, for a consistent landing target

## 9. Verification

- [x] 9.1 Manual walkthrough: record income, expense, and a transfer from Transactions; confirm account balances and Dashboard totals update — verified live via API calls + page fetches: Smoke Bank 1000 + 80000 income − 50000 expense − 5000 transfer = 26000.00; Smoke Wallet 0 + 5000 transfer = 5000.00; income/expense totals unaffected by the transfer
- [x] 9.2 Quick-add uses the same shared `<RecordTransactionDialog>` + single `recordTransactionAction` from every screen (Transactions/Income/Expenses/Dashboard) — one code path, no duplication risk by construction
- [x] 9.3 Confirmed live: Dashboard/Income/Expenses pages contain zero edit/delete controls; Transactions page contains them; recent-transaction rows link to `/transactions?highlight=<id>`
- [x] 9.4 Confirmed live: search, type, category, period, and combined filters (search+period+category, and a deliberately-mismatched search+category producing an empty result while preserving the search term in the form) all compose correctly
- [x] 9.5 Confirmed live: Reports Monthly Summary omits "Top expense category" (shows "No expenses recorded for this period") for a custom range with no expenses, rather than showing a zero-amount category
- [x] 9.6 Full suite: 46/46 tests pass, including the original 28 baseline tests unmodified
- [x] 9.7 Chart components use only the existing semantic tokens (`--chart-1..5`, `--positive`/`--negative` via `text-positive`/`text-negative`), confirmed defined in both light and dark blocks in `globals.css` (D13 precedent) — no new ad-hoc color logic added
