## Why

Recording an expense, transfer, or investment contribution never checks whether the paying account actually has enough money. An account with a ৳5,000 balance can currently have a ৳50,000 expense, transfer-out, or investment contribution recorded against it, driving the account to a negative balance the system never questions. Because `transactionDate` also has no upper bound, a future-dated income can mask a present-day shortfall even if a naive "final total" check were added, so the fix must validate the account's balance chronologically, not just at its current total.

## What Changes

- Add a chronological balance-sufficiency guard: before any write that can decrease an account's balance, replay that account's `openingBalance` forward through all of its transactions in `(transactionDate, createdAt, id)` order and reject the write if the running balance would go negative at any point in that ordered sequence — not merely at the end.
- Apply the guard to every operation that can decrease a balance: recording an `EXPENSE`, the source side of a `TRANSFER`, an `INVESTMENT_CONTRIBUTION` (including an investment's initial contribution), editing any transaction in a way that increases its outflow effect or moves it earlier in time, and deleting an inflow transaction (`INCOME`, transfer-in, `INVESTMENT_RETURN`).
- Do **not** guard operations that can only increase a balance (recording `INCOME`/transfer-in/`INVESTMENT_RETURN`, deleting an outflow transaction) — these are safe by construction and must not be slowed down by an unnecessary check.
- Include `vatAmount` in the outflow amount checked for `EXPENSE` and transfer-out transactions, matching the existing balance formula in `AccountService.computeBalances`.
- **BREAKING**: Reject the write with a new `INSUFFICIENT_BALANCE` (409) `AppError` instead of silently succeeding, whenever the chronological check fails. Existing callers that assumed these writes always succeed must handle this new rejection.
- **BREAKING**: Restrict `transactionDate` (and the investment `startDate`, contribution date, and maturity/withdrawal date) to today-or-earlier, at both the zod validation layer and the date `<input>` UI layer. Previously-valid future-dated submissions are now rejected.
- Apply no audit or backfill of existing historical data — the chronological check only applies going forward, to new writes.

## Capabilities

### New Capabilities

_None._ This change enforces a new business rule and closes a validation gap in existing capabilities; it does not introduce a new feature area.

### Modified Capabilities

- `transactions`: "Record Expense Transaction," "Record Transfer Transaction," and "Edit and Delete Transactions" requirements gain balance-sufficiency and chronological-ordering preconditions; a new requirement restricts `transactionDate` to today-or-earlier.
- `investments`: "Record Investment Contribution" (including the initial contribution made during "Create Investment") gains a balance-sufficiency precondition; `startDate`/contribution/maturity dates gain the today-or-earlier restriction.

## Impact

- `src/lib/services/transaction-service.ts` — `recordIncomeOrExpense`/`recordExpense`, `recordTransfer`, `update`, `delete`.
- `src/lib/services/investment-service.ts` — `contribute`, `createWithInitialContribution`.
- `src/lib/services/account-service.ts` — new chronological-replay balance logic alongside the existing `computeBalances`/`computeBalancesFor`.
- `src/lib/errors.ts` — new `INSUFFICIENT_BALANCE` (409) error code.
- `src/lib/validation/transaction.ts`, `src/lib/validation/investment.ts` — add today-or-earlier bound on date fields.
- `src/components/transactions/record-transaction-dialog.tsx` and the investment form/contribute/maturity dialogs — add `max` date bound on date inputs; existing `AppError`-to-form-banner wiring surfaces the new rejection with no further client changes.
- No schema/migration change: balance remains fully derived, no new stored column.
