## Why

VAT is fully wired end-to-end in the data layer (`Transaction.vatAmount`, validation, the record/edit forms) and already reduces the affected account's computed balance, but it's invisible everywhere a user reads their spending back: transaction rows show only `amount`, and every expense total (Expenses page, category breakdown, trend chart, monthly summary) deliberately excludes VAT. A user who enters VAT sees their account balance drop by more than their "total expenses" says it should, with no explanation anywhere in the UI.

## What Changes

- Transaction rows (Transactions list and the shared recent-transactions list used on Income/Expenses/Dashboard) show a VAT line and a totaled amount when a transaction has `vatAmount` set, instead of silently showing only `amount`.
- All expense/transfer-out totals (`TransactionService.getSummary`, `AnalyticsService.getCategoryBreakdown`, `AnalyticsService.getMonthlyTrend`) include VAT in their summed figures, so they reconcile with the account balance impact already computed by `AccountService`. **BREAKING**: these totals will now read higher than before for any period containing VAT-bearing transactions — this is a correction, not a new option, and existing periods with recorded VAT will show different (correct) historical totals.
- The Expenses screen's "Total expenses" stat card shows the VAT-inclusive total with a muted "incl. ৳X VAT" caption, so the merge into one number doesn't just hide VAT inside a bigger figure.

## Capabilities

### New Capabilities
(none — this extends existing capabilities' handling of an existing field)

### Modified Capabilities
- `transactions`: Monthly Aggregation (`getSummary`) includes VAT in the period's expense total and net cash flow.
- `analytics`: Category breakdown and monthly trend aggregations include VAT in expense sums.
- `transactions-ui`: Transaction list rows display the VAT amount and the VAT-inclusive total when a transaction carries VAT.
- `expenses-ui`: The Total expenses stat card shows the VAT-inclusive total with a breakdown caption.

## Impact

- Code: `src/lib/services/transaction-service.ts` (`getSummary`), `src/lib/services/analytics-service.ts` (`getCategoryBreakdown`, `getMonthlyTrend`), `src/app/(app)/transactions/transaction-table.tsx`, `src/components/transactions/recent-transactions-list.tsx`, `src/app/(app)/expenses/page.tsx`.
- Downstream, no code change needed but numbers shift: Dashboard's income/expense/net-cash-flow/savings-rate cards and the dashboard expense breakdown chart consume the same `getSummary`/`getCategoryBreakdown` calls, so they pick up VAT-inclusive totals automatically once those services change.
- No migration or backfill: totals are derived at read time from `amount` + `vatAmount`, nothing is pre-aggregated in storage, so historical periods simply recompute correctly.
- `AccountService.computeBalances` is unchanged — it already treats VAT this way; this change brings the rest of the app in line with it.
- Income transactions never carry VAT (enforced by existing validation), so `income-ui` is unaffected.
