## 1. Error code

- [x] 1.1 Add `INSUFFICIENT_BALANCE` (409) to the error code map in `src/lib/errors.ts`, alongside `ALLOCATION_EXCEEDS_BALANCE`/`INVALID_TRANSFER`.

## 2. Chronological balance-replay helper

- [x] 2.1 In `src/lib/services/account-service.ts`, add a function that, given a `prisma` transaction client, `userId`, and `accountId`, loads all of that account's transactions (as both `accountId` and, where relevant, `sourceAccountId`/`destinationAccountId`) ordered by `(transactionDate, createdAt, id)`, replays `openingBalance` forward applying each transaction's effect (mirroring the sign conventions already used in `computeBalances`, including VAT), and returns whether the running balance ever goes negative — or throws `AppError("INSUFFICIENT_BALANCE", ...)` directly. Implemented as `assertChronologicalBalanceNonNegative`.
- [x] 2.2 Simplified from the original "hypothetical override" idea: since every guarded write already runs inside `prisma.$transaction`, the helper instead runs *after* the mutation (create/update/delete) against what the DB now actually contains, and throwing rolls back the whole transaction. This is simpler than threading a hypothetical row through the walk and is equally correct — no separate override path needed.
- [x] 2.3 Unit tests added in `tests/account-service.test.ts` covering: sufficient balance passes; an outflow exceeding current balance fails; a backdated outflow inserted earlier in the sequence fails even though the final total stays positive; same-day ordering via `createdAt` tiebreak; VAT included in the outflow amount for expense/transfer-out.

## 3. Wire the guard into transaction writes

- [x] 3.1 In `TransactionService.recordIncomeOrExpense`/`recordExpense` (`src/lib/services/transaction-service.ts`), call the helper for the `EXPENSE` direction only, inside the existing `prisma.$transaction`, before/at the point of insert; leave `recordIncome` unguarded.
- [x] 3.2 In `TransactionService.recordTransfer`, call the helper against `sourceAccountId` only, inside the existing transfer `prisma.$transaction`.
- [x] 3.3 In `TransactionService.update`, call the helper against every account the edited transaction affects (both accounts for a `TRANSFER`, unconditionally on any edit), before committing the update.
- [x] 3.4 In `TransactionService.delete`, call the helper only when the transaction being deleted is an inflow type (`INCOME`, transfer-in side via `destinationAccountId`, `INVESTMENT_RETURN`); skip the check entirely for outflow deletions.
- [x] 3.5 In `InvestmentService.contribute` and `InvestmentService.createWithInitialContribution` (`src/lib/services/investment-service.ts`), call the helper against the funding account before recording the `INVESTMENT_CONTRIBUTION`.

## 4. Date bound (today-or-earlier)

- [x] 4.1 Add a shared "not later than today" zod refinement/helper for date fields (e.g. in `src/lib/validation/money.ts` or a new sibling module) and apply it to `transactionDate` in `recordIncomeOrExpenseSchema`, `recordTransferSchema`, and `updateTransactionSchema` (`src/lib/validation/transaction.ts`). Implemented as `zPastOrPresentDate` in a new `src/lib/validation/date.ts`.
- [x] 4.2 Apply the same bound to `startDate` and the contribution/maturity `transactionDate` fields in `src/lib/validation/investment.ts`. `Investment.maturityDate` (forward-looking, expected) is deliberately left unrestricted.
- [x] 4.3 Add a `max` attribute (today's date) to the date `<input>` elements in `src/components/transactions/record-transaction-dialog.tsx` and the investment form/contribute/maturity dialogs under `src/app/(app)/investments/`.

## 5. Error surfacing

- [x] 5.1 Confirmed `INSUFFICIENT_BALANCE` (and the date-bound validation error) surface through the existing generic `AppError` → `state.errorMap.onSubmit` form-banner wiring in `record-transaction-dialog.tsx` and the investment dialogs — no code change needed there. Found and fixed one real gap: `deleteTransactionAction`/`DeleteTransactionDialog` never caught `AppError` at all (delete has no form), so a rejected delete of an inflow transaction would have surfaced as an unhandled server error. Both now follow the same catch-and-display pattern as the other actions/dialogs.
- [x] 5.2 Verified: `toErrorResponse` (`src/lib/errors.ts`) is generic over any `AppError` code, so the transactions/transfer/investments API routes propagate `INSUFFICIENT_BALANCE` with its 409 status automatically — no route changes needed.

## 6. Verification

- [x] 6.1 Added/extended service-level tests for `recordExpense`, `recordTransfer`, `update`, `delete`, `InvestmentService.contribute`, and `createWithInitialContribution` covering the new rejection scenarios (`tests/transaction-service.test.ts`, `tests/investment-service.test.ts`, `tests/account-service.test.ts`), plus a new `tests/validation-date.test.ts` for the date bound. Also fixed several **pre-existing** tests that had been relying on the old (buggy) permissive behavior — they created expenses/transfers against zero-balance accounts with no funding income, or explicitly asserted a negative balance was normal — by funding the accounts appropriately (`account-service.test.ts`, `transaction-service.test.ts`, `analytics-service.test.ts`); no assertions about the actual feature under test in those files changed, only their account funding. Full suite: 108/108 passing, `tsc --noEmit` clean, `npm run lint` shows only 2 pre-existing unrelated errors (carousel.tsx, use-mobile.ts).
- [x] 6.2 Verified via `tests/transaction-service.test.ts` / `tests/investment-service.test.ts` / `tests/account-service.test.ts`: an oversized expense/transfer/contribution against an underfunded account is now rejected with `INSUFFICIENT_BALANCE`, and ordinary in-budget operations still succeed. **Not manually verified in a running browser** — no dev-server/browser QA pass was done in this session; only automated service/validation tests.
- [x] 6.3 Verified server-side via `tests/validation-date.test.ts`: a future `transactionDate`/`startDate` is rejected by the zod schema, while a future `maturityDate` is correctly left unrestricted. Client-side `max` date-input attribute added in task 4.3. **Not manually verified in a running browser.**
