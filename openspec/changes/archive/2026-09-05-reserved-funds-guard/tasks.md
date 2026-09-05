## 1. Data Model

- [x] 1.1 Add `GoalReservationPromise` Prisma model: `id`, `userId`, `savingsGoalId`, `accountId`, `amount`, `remainingAmount`, `dueDate`, `status` (`OPEN` | `PARTIALLY_RESOLVED` | `RESOLVED` | `WRITTEN_OFF` — `OVERDUE` is derived at read time from `dueDate`, not stored, matching the goal achieved-state convention), `createdAt`/`updatedAt`.
- [x] 1.2 Add nullable link fields on `GoalAllocationEvent` to trace provenance: `sourceTransactionId` (the transaction whose dip created this event) and `promiseId` (for both the original negative event and any later positive return events created against a promise).
- [x] 1.3 Generate and review the Prisma migration; confirm no existing columns/behavior change for `GoalAllocationEvent` rows created via existing `allocate`/`moveAllocation` paths (their new link fields stay null).

## 2. Shortfall Detection & Consent Enforcement (Server)

- [x] 2.1 Add a shared helper (e.g. in `savings-goal-service.ts` or a new module) computing an account's current unallocated balance, reusing the existing `sumAllocationsForAccount` logic already used by `SavingsGoalService.allocate`.
- [x] 2.2 In `transaction-service.ts`, after `assertChronologicalBalanceNonNegative` succeeds for `recordExpense` and `recordTransfer` (source account), compute `(amount + vatAmount) − unallocated`; if positive, require the request to carry consent input (goal selections, per-goal amounts, CONCENT confirmation flag, permanent/return-by-date choice per goal) or reject with a new error code (e.g. `RESERVATION_CONSENT_REQUIRED`) carrying the shortfall amount so the client can open the wizard.
- [x] 2.3 Apply the same check in `investment-service.ts`'s `contribute` (and the initial-contribution path in `create`) for `INVESTMENT_CONTRIBUTION`.
- [x] 2.4 Validate consent input server-side regardless of client behavior: reject if selected goals don't belong to the user/account, if per-goal amounts don't sum exactly to the computed shortfall, or if CONCENT confirmation is missing — never trust client-side gating alone.
- [x] 2.5 On valid consent, within the same `prisma.$transaction` as the underlying transaction creation: create the transaction, one negative `GoalAllocationEvent` per selected goal (linked via `sourceTransactionId`), and for goals marked "returning," a `GoalReservationPromise` (status `OPEN`) linked to its event.

## 3. Promise Lifecycle (Server)

- [x] 3.1 Add promise actions to `savings-goal-service.ts` (or a new `goal-reservation-service.ts`): `returnAgainstPromise(userId, promiseId, amount)` — validates `amount ≤ remainingAmount`, creates a positive `GoalAllocationEvent` linked to the promise, decrements `remainingAmount`, updates status to `PARTIALLY_RESOLVED` or `RESOLVED`.
- [x] 3.2 Add `writeOffPromise(userId, promiseId)` — closes the promise as `WRITTEN_OFF` regardless of `remainingAmount`, creates no allocation event.
- [x] 3.3 Add a read path computing effective status at query time (`OVERDUE` when `dueDate` has passed and `remainingAmount > 0`, without a stored/cron-updated flag), consistent with this codebase's existing derived-state conventions (e.g. achieved-state in `getProgress`).
- [x] 3.4 Add `listOpenPromises(userId)` returning all `OPEN`/`PARTIALLY_RESOLVED`/`OVERDUE` promises with goal name, account name, `remainingAmount`, `dueDate`, for the dashboard banner.

## 4. Delete/Edit Interaction

- [x] 4.1 In `TransactionService.delete`, before/alongside the existing delete logic: find any `GoalAllocationEvent`(s) with `sourceTransactionId` equal to the deleted transaction's id; for each, create a reversing positive event and close (cancel) any linked `GoalReservationPromise`.
- [x] 4.2 Confirm `TransactionService.update` (amount edits) requires no new code path — verify by test that editing an amount leaves existing `sourceTransactionId`-linked events/promises untouched, and that the edited amount is (re-)checked independently via task 2.2/2.3's logic if applicable to that transaction type. (Scoped to creation only, per the spec's "New Outflow Transactions" wording — edits don't re-trigger the guard; verified by test.)
- [x] 4.3 Apply the equivalent delete-reversal to investment contribution deletion if/where that exists as a separate path from `TransactionService.delete`. (No separate path exists — all transaction deletion, including `INVESTMENT_CONTRIBUTION`, routes through `TransactionService.delete`, already covered by 4.1.)

## 5. Consent Wizard (Client)

- [x] 5.1 Build a reusable two-step dialog component: Step 1 (warning text + `CONCENT` text input, Next disabled until exact match, Cancel closes with no side effects); Step 2 (goal checklist with per-goal amount inputs, running-sum validation against the shortfall, per-goal permanent/return-by-date radio + date picker, Back/Confirm).
- [x] 5.2 Wire the expense recording form (`src/app/(app)/expenses/page.tsx` or wherever the create-expense TanStack Form lives) to catch the `RESERVATION_CONSENT_REQUIRED` response, open the wizard pre-filled with the shortfall and the account's reserving goals, and resubmit with consent payload on confirm.
- [x] 5.3 Wire the transfer recording flow (`src/app/api/transactions/transfer/route.ts` client caller) the same way for outgoing transfers.
- [x] 5.4 Wire the investment contribution flow the same way. (Both `ContributeDialog` and `InvestmentFormDialog`'s "fund now" tab.)
- [x] 5.5 Ensure cancelling the wizard at any step leaves the originating form exactly as the user left it (no transaction submitted, fields preserved).

## 6. Dashboard Banner (Client)

- [x] 6.1 Add a banner component at the top of `src/app/(app)/dashboard/page.tsx`, sourced from `listOpenPromises`, rendering one line per promise with goal name, remaining amount, due date, and overdue styling when applicable.
- [x] 6.2 Add "Return" action (amount input ≤ remainingAmount) calling `returnAgainstPromise`, and "Write off" action calling `writeOffPromise`, both refreshing the banner (and any affected goal progress views) on success.
- [x] 6.3 Confirm the banner renders nothing (no empty card/placeholder) when there are no open/overdue promises.

## 7. Verification

- [x] 7.1 Unit tests for shortfall computation (with/without VAT, exactly-at-boundary, multiple goals).
- [x] 7.2 Unit tests for the consent-required rejection and successful consent path across expense, transfer, and investment contribution.
- [x] 7.3 Unit tests for promise partial return, full return, write-off, and overdue-derivation.
- [x] 7.4 Unit tests for delete-auto-reversal and edit-independence (D9 in design.md).
- [x] 7.5 Confirm existing `savings-goals` and `transactions` test suites still pass unchanged (this change must not alter their behavior). (133/133 tests pass, including 21 new ones.)
- [x] 7.6 Manual/browser QA: trigger the wizard end-to-end from the expense form, promise a return, mark it returned from the dashboard banner, and verify goal progress reflects each step. (Verified live in Chrome against the dev server: CONCENT gate, goal split, permanent + returning paths, partial return, full return, write-off, and wizard-cancel-preserves-form all worked exactly as specced; zero console errors. See conversation for full walkthrough.)
