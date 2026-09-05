## Context

`Transaction.vatAmount` (`prisma/schema.prisma:141`) is a nullable `Decimal(14,2)` set only on `EXPENSE` and `TRANSFER` transactions (never `INCOME` — enforced in `src/lib/validation/transaction.ts`). `AccountService.computeBalances` (`src/lib/services/account-service.ts:30-51`) already subtracts `vatAmount` from the paying/source account's balance, alongside `amount`. Every other place that sums `amount` for a period — `TransactionService.getSummary`, `AnalyticsService.getCategoryBreakdown`, `AnalyticsService.getMonthlyTrend` — does not, per an explicit prior decision recorded in a code comment ("VAT ... doesn't affect category totals or getSummary"). No UI surface renders `vatAmount` outside the record/edit forms, even though `TransactionListItem` already carries it to the client.

This change reverses that prior exclusion: VAT becomes part of "how much did this cost" everywhere a total or a row is shown, matching what `AccountService` already does.

## Goals / Non-Goals

**Goals:**
- Every expense/transfer-out total a user can see (Total expenses card, category breakdown, trend chart, monthly summary, and anything downstream like the Dashboard that consumes those same service calls) reconciles with the account balance impact.
- A transaction row with VAT shows the amount, the VAT, and a totaled figure equal to what actually left the account; a transaction without VAT renders exactly as today.
- No data migration — everything is derived at read time from existing columns.

**Non-Goals:**
- Not changing how VAT is captured/edited (the record/edit forms already handle this correctly).
- Not adding VAT as a first-class reporting dimension (e.g. no "VAT paid this year" report) — that was the alternative the user explicitly declined in favor of folding VAT into totals.
- Not changing `AccountService.computeBalances` — it's already correct and is the reference behavior this change aligns everything else to.
- Not touching `INCOME` transactions or `income-ui` — VAT cannot exist on income rows.

## Decisions

**D1 — Sum `amount + COALESCE(vatAmount, 0)` at the query level, not in application code.**
`getSummary`, `getCategoryBreakdown`, and `getMonthlyTrend` are raw-SQL/Prisma-aggregate queries (not "load rows then sum in JS"), matching the existing "Aggregations are scoped ... via database aggregation" requirements in `transactions` and `analytics` specs. VAT gets added into the same `SUM(CASE WHEN ...)` expressions already used for `amount`, keeping the "one aggregate query, not N+1" property intact. Alternative considered: expose `vatAmount` as a second returned field and add it client-side — rejected, since `getCategoryBreakdown` uses Prisma's `groupBy` with `_sum`, and doing the add-then-round in JS across two decimal fields per row risks rounding drift versus doing it once in SQL/Prisma with `Decimal` semantics.

**D2 — VAT only applies to the expense side of a transfer, matching `AccountService`.**
For `TRANSFER`, VAT is only ever recorded against the source account (see the record dialog: "Deducted from the from account"). Since transfers are already excluded from `getSummary`'s expense figure and from `getCategoryBreakdown`/`getMonthlyTrend` entirely (per the existing `transactions`/`analytics` specs — transfers aren't income or expense), transfer VAT does not enter any of the totals this change modifies. It only ever shows up in the row-level display (D3), because that's the only place a transfer transaction's own record is rendered.

**D3 — Row-level split only renders when `vatAmount` is non-null; the trailing number becomes amount+VAT.**
`transaction-table.tsx` and `recent-transactions-list.tsx` both already compute `amount` and format it as the trailing figure. Add a conditional block: when `transaction.vatAmount` is present, render three stacked lines (amount, `+VAT`, ruled total) where the total is what's shown bold/primary; when absent, render exactly the current single line. This keeps the common case (no VAT) visually unchanged.

**D4 — Expenses page's Total expenses card shows the VAT-inclusive number with a muted "incl. ৳X VAT" caption.**
`summary.expense` (now VAT-inclusive per D1) is the headline figure; the caption is `summary.expense - <amount-only total>`, computed either as a second field returned by `getSummary` or as a simple client-side subtraction if `getSummary` also returns the amount-only figure. Simplest: have `getSummary` return both `expense` (VAT-inclusive) and `expenseVat` (the VAT portion alone), so the page never has to re-derive it.

## Risks / Trade-offs

- **[Risk]** Historical periods will show different (higher) expense totals than before this change ships, for any period containing VAT-bearing transactions. → **Mitigation**: this is a correctness fix, not a new feature toggle — the proposal calls it out as **BREAKING** in that sense; no migration needed since it's derived at read time, and the new numbers are the ones that already matched the account balance.
- **[Risk]** `getSummary`'s net cash flow (`income - expense`) will decrease for VAT-bearing periods since expense goes up. → **Mitigation**: this is correct — net cash flow should reflect the VAT actually paid out; it was previously overstated.
- **[Risk]** Adding a second field to `getSummary`'s return shape (D4) is a small interface change consumed by Dashboard and Expenses. → **Mitigation**: additive field, existing consumers reading only `.expense`/`.income` keep working unchanged.

## Migration Plan

No data migration. Deploy is a plain code change: query/aggregation updates plus two UI components. Rollback is a plain revert — no stored/derived data needs to be reverted since nothing new is persisted.

## Open Questions

None outstanding — both open decisions from exploration (fold VAT into totals; row-level split-amount treatment) were confirmed by the user before this proposal was written.
