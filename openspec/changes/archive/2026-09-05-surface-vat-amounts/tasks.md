## 1. Service layer: fold VAT into expense/net totals

- [x] 1.1 In `TransactionService.getSummary` (`src/lib/services/transaction-service.ts`), add a `vatAmount` sum for `EXPENSE` rows into the `expense` and `netCashFlow` `CASE`/`SUM` expressions; add a separate `expenseVat` field to the returned row (and its fallback object) so callers can show the VAT portion without re-deriving it
- [x] 1.2 In `AnalyticsService.getCategoryBreakdown` (`src/lib/services/analytics-service.ts`), extend the `EXPENSE` branch's summed amount to include each transaction's `vatAmount` (switch from Prisma `groupBy`/`_sum` to a raw aggregate query if needed to sum two columns per group, per design.md D1)
- [x] 1.3 In `AnalyticsService.getMonthlyTrend`, add `vatAmount` into the `expense` `CASE`/`SUM` expression alongside `amount`
- [x] 1.4 Update/add unit tests in `tests/transaction-service.test.ts` covering `getSummary` with a VAT-bearing expense (expense total, net cash flow, and `expenseVat` all correct) and with no VAT (unchanged behavior)
- [x] 1.5 Add/update tests for `AnalyticsService.getCategoryBreakdown` and `getMonthlyTrend` covering a VAT-bearing expense in a category and in a month

## 2. Transaction row display

- [x] 2.1 In `src/app/(app)/transactions/transaction-table.tsx`, when `transaction.vatAmount` is non-null, render the amount line, a `+VAT` line, and a ruled total line (`amount + vatAmount`) as the primary trailing figure; when null, keep today's single-line rendering unchanged
- [x] 2.2 Apply the same conditional rendering to `src/components/transactions/recent-transactions-list.tsx` (shared by Income, Expenses, and Dashboard)
- [x] 2.3 Confirm sign/color conventions (income green, expense red) still apply correctly to the totaled figure, not just the base amount

## 3. Expenses screen total-expenses card

- [x] 3.1 In `src/app/(app)/expenses/page.tsx`, use `summary.expense` (now VAT-inclusive) as the headline figure and, when `summary.expenseVat` is greater than zero, render a muted caption showing the VAT portion (e.g. "incl. ৳X VAT"); omit the caption when there's no VAT in the period

## 4. Verification

- [x] 4.1 Run the full test suite and confirm existing tests relying on VAT-exclusive totals are updated to the new expected values, not silently left passing against stale assumptions
- [x] 4.2 Manually record an expense with VAT, an expense without VAT, and a transfer with VAT, then verify: the Transactions list row totals, the Expenses page total and category breakdown, the Dashboard's expense/net-cash-flow figures, and the affected account's balance all agree with each other
