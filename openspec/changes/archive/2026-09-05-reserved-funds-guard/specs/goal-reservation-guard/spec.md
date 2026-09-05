## ADDED Requirements

### Requirement: Detect a Reserved-Funds Shortfall on New Outflow Transactions
The system SHALL, for every new `EXPENSE`, `INVESTMENT_CONTRIBUTION`, or outgoing `TRANSFER` transaction, compute whether `amount` plus any `vatAmount` exceeds the source account's unallocated balance (computed balance minus the sum of that account's `GoalAllocationEvent` entries), and SHALL perform this check only after the transaction has already passed the existing insufficient-balance check for that account.

#### Scenario: Shortfall detected on an expense
- **WHEN** a user attempts a ৳700 expense on an account with ৳500 unallocated
- **THEN** the system computes a ৳200 shortfall and requires the reservation consent flow before the transaction can be created

#### Scenario: No shortfall, transaction proceeds unchanged
- **WHEN** a user attempts a ৳400 expense on an account with ৳500 unallocated
- **THEN** the system creates the transaction immediately with no consent flow, identical to current behavior

#### Scenario: Insufficient balance takes precedence
- **WHEN** a user attempts a ৳15,000 expense on an account whose chronological running balance at that point would only be ৳10,500
- **THEN** the system rejects the transaction with `INSUFFICIENT_BALANCE` and never evaluates or surfaces the reservation consent flow

#### Scenario: VAT counts toward the shortfall
- **WHEN** a user attempts a ৳450 expense with ৳100 `vatAmount` on an account with ৳500 unallocated
- **THEN** the system computes the combined ৳550 against the ৳500 unallocated balance and detects a ৳50 shortfall

### Requirement: Reservation Consent Wizard
The system SHALL require, before creating a transaction with a detected reserved-funds shortfall, that the user complete a two-step consent flow: Step 1 requires typing the exact literal string `CONCENT` before proceeding; Step 2, reachable only after Step 1 succeeds, requires selecting one or more goals sharing the account's reservation and typing an amount for each such that the amounts sum exactly to the shortfall, then choosing for each selected goal whether the amount is a permanent reduction or is expected to return by a specified date. The system SHALL NOT create the transaction, any allocation event, or any promise until the user submits the final confirmation of Step 2.

#### Scenario: Step 1 blocks progress until exact match
- **WHEN** a user viewing Step 1 of the consent flow has not yet typed the exact string `CONCENT`
- **THEN** the system prevents proceeding to Step 2

#### Scenario: Cancelling before final confirm creates nothing
- **WHEN** a user cancels the consent flow at any point before Step 2's final confirmation
- **THEN** the system creates no transaction, no allocation event, and no promise

#### Scenario: Per-goal amounts must sum exactly to the shortfall
- **WHEN** a user has selected two goals to cover a ৳200 shortfall and typed ৳150 for one and ৳40 for the other
- **THEN** the system prevents final confirmation until the typed amounts sum exactly to ৳200

#### Scenario: Single goal, permanent reduction
- **WHEN** a user completes the consent flow selecting one goal for the full shortfall and choosing "permanent reduction"
- **THEN** the system creates the transaction and a single negative `GoalAllocationEvent` for that goal, and creates no `GoalReservationPromise`

#### Scenario: Single goal, promised return
- **WHEN** a user completes the consent flow selecting one goal for the full shortfall and choosing "returning by" a specified future date
- **THEN** the system creates the transaction, a negative `GoalAllocationEvent` for that goal, and a `GoalReservationPromise` with that amount, that due date, and status open

### Requirement: Reservation Ledger Effects Are Shortfall-Scoped
The system SHALL, upon confirming the consent flow, create exactly one negative `GoalAllocationEvent` per goal selected in Step 2, each for that goal's typed shortfall-share amount, never for the transaction's full amount.

#### Scenario: Only the shortfall touches the ledger
- **WHEN** a user confirms a consent flow for a ৳700 expense where only ৳200 of it was a reserved-funds shortfall
- **THEN** the resulting negative `GoalAllocationEvent`(s) sum to exactly ৳200, not ৳700

### Requirement: Reservation Promise Lifecycle
The system SHALL track each `GoalReservationPromise` with an original `amount`, a `remainingAmount` (initialized to `amount`), a `dueDate`, and a status among open, overdue, partially resolved, resolved, or written-off. The system SHALL allow the user to record a return of up to `remainingAmount` at any time, decreasing `remainingAmount` by that amount and creating a corresponding positive `GoalAllocationEvent` linked to the promise, and SHALL allow the user to write off any remaining `remainingAmount` at any time, closing the promise without creating any further allocation event. The system SHALL NOT automatically expire, remove, or reverse a promise when its `dueDate` passes.

#### Scenario: Partial return
- **WHEN** a user records a ৳100 return against an open ৳200 promise
- **THEN** the promise's `remainingAmount` becomes ৳100, its status becomes partially resolved, and a +৳100 `GoalAllocationEvent` is created for that goal/account

#### Scenario: Full return resolves the promise
- **WHEN** a user's cumulative returns against a promise bring its `remainingAmount` to zero
- **THEN** the promise's status becomes resolved

#### Scenario: Write off remaining balance
- **WHEN** a user writes off a promise with ৳100 `remainingAmount` still outstanding
- **THEN** the promise's status becomes written-off, its `remainingAmount` is unchanged at ৳100 for record-keeping, and no additional `GoalAllocationEvent` is created

#### Scenario: Overdue promise persists
- **WHEN** a promise's `dueDate` passes while its `remainingAmount` is still greater than zero
- **THEN** the promise's status reflects overdue and it continues to require an explicit return or write-off action; it is never automatically removed or resolved

### Requirement: Deleting a Transaction Reverses Its Reservation Effects
The system SHALL, when a transaction that created one or more `GoalAllocationEvent`s via the reservation consent flow is deleted, automatically create a reversing positive `GoalAllocationEvent` for each such event and automatically close (cancel) any `GoalReservationPromise` linked to them, regardless of how much of that promise had already been returned.

#### Scenario: Deleting the originating transaction undoes the dip
- **WHEN** a user deletes an expense that had created a ৳200 negative `GoalAllocationEvent` and an open promise for that ৳200
- **THEN** the system creates a +৳200 reversing `GoalAllocationEvent` for that goal and closes the linked promise

### Requirement: Editing a Transaction's Amount Does Not Reconcile Its Original Reservation Effects
The system SHALL NOT modify or reverse a transaction's existing reservation-related `GoalAllocationEvent`(s) or `GoalReservationPromise`(s) when that transaction's amount is edited (as opposed to deleted). The system SHALL evaluate the edited amount for a new, independent reserved-funds shortfall against whatever unallocated balance exists at the time of the edit.

#### Scenario: Editing amount leaves the original promise untouched
- **WHEN** a user edits the amount of an expense that previously created a ৳200 negative `GoalAllocationEvent` and an open promise
- **THEN** that `GoalAllocationEvent` and promise remain unchanged, and the edited amount is checked independently for its own reserved-funds shortfall
