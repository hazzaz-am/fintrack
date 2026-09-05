## Why

Today, recording an expense, investment contribution, or transfer only checks that an account's balance stays non-negative — it has no awareness of savings-goal allocations. A user can allocate ৳10,000 of a ৳10,500 BRAC Bank balance to a "Marriage" goal, then spend or invest into the ৳10,000 reserved portion with zero warning, because the existing insufficient-balance check only looks at the raw account balance, not what's already earmarked. The only existing over-allocation signal (`savings-goals` capability's "Over-Allocation Warning") is a non-blocking, after-the-fact warning meant for retroactive transaction edits — it was never designed to stop a user from knowingly raiding a reserved goal at the moment they create a new transaction. This change adds that missing, explicit guard: a blocking consent step at transaction-creation time, plus a way to promise the dipped amount will return by a date and be nagged about it until resolved.

## What Changes

- New blocking check on **new** `EXPENSE`, `INVESTMENT_CONTRIBUTION`, and outgoing `TRANSFER` transactions: if `(amount + vatAmount)` exceeds the source account's unallocated balance (computed balance minus sum of that account's `GoalAllocationEvent`s), the transaction cannot be created without going through a two-step consent wizard. Runs only after the existing `INSUFFICIENT_BALANCE` check passes.
- Step 1 of the wizard requires the user to type the literal string `CONCENT` (exact match) before proceeding; step 2 requires selecting which reserved goal(s) on that account absorb the shortfall, with a manually-typed amount per goal summing exactly to the shortfall, and for each goal a choice of "permanent reduction" or "returning by [date]". Nothing is persisted until the final confirm.
- On confirm: the transaction is created, plus one negative `GoalAllocationEvent` per selected goal for its shortfall share, plus (for goals marked "returning") a new `GoalReservationPromise` record tracking `amount`, `remainingAmount`, `dueDate`, and status.
- New dashboard banner listing every open/overdue `GoalReservationPromise`, each independently supporting a partial-or-full "return" action (writes a new positive `GoalAllocationEvent`, reduces `remainingAmount`) and a "write off remainder" action (closes the promise, no further allocation event). Overdue promises switch to an overdue visual state but are never auto-expired.
- Deleting a transaction that caused one or more of these dips auto-reverses its linked `GoalAllocationEvent`(s) and auto-cancels any linked promise(s). Editing a transaction's amount leaves the original dip/promise untouched; the edited amount is evaluated fresh, independently.
- **BREAKING**: none — fully additive. Transactions that don't dip into a goal's reserve behave exactly as before.

## Capabilities

### New Capabilities
- `goal-reservation-guard`: the dip-detection trigger, the CONCENT consent wizard, the `GoalReservationPromise` entity and its lifecycle (open/overdue/partially-resolved/resolved/written-off), the negative/positive `GoalAllocationEvent` bookkeeping this guard creates, and the delete-auto-reversal / edit-independence rules — all layered on top of the existing `savings-goals` and `transactions` capabilities without modifying their existing requirements.

### Modified Capabilities
- `dashboard-ui`: adds a requirement for a persistent top-of-dashboard banner surfacing open and overdue `GoalReservationPromise` records, with return and write-off actions.

## Impact

- **Services**: `TransactionService.recordExpense` / `recordTransfer` / (investment contribution recording, wherever it lives) gain a pre-commit shortfall check and must accept optional consent/allocation-split/promise input; `SavingsGoalService` (or a new service) gains promise CRUD (create, partial/full return, write-off) and reuses its existing `sumAllocationsForAccount` balance math.
- **Data model**: new `GoalReservationPromise` table/model linked to `GoalAllocationEvent`, `SavingsGoal`, `Account`, and the originating `Transaction`; possibly a `sourceTransactionId` or similar link on `GoalAllocationEvent` to support delete-auto-reversal.
- **API/UI**: new two-step consent dialog wired into the expense/investment-contribution/transfer forms (all of which already migrated to TanStack Form per recent work); new dashboard banner component and its return/write-off actions.
- **Existing behavior unaffected**: `savings-goals`'s "Allocation Cannot Exceed Unallocated Balance" and "Over-Allocation Warning" requirements, and `transactions`'s existing insufficient-balance and future-date checks, are unchanged.
