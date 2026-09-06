## REMOVED Requirements

### Requirement: Loan Disbursement Cannot Exceed the Source Account's Unallocated Balance
**Reason**: Loans now follow the same consent-gated dip mechanism as every other outflow type (`goal-reservation-guard`'s "Detect a Reserved-Funds Shortfall on New Outflow Transactions", widened to include `LOAN_DISBURSEMENT`), rather than being hard-rejected with no override path.
**Migration**: No data migration needed — no existing `Loan` could have exceeded its source account's unallocated balance under the old hard cap, so no historical row is affected. Callers checking for the `LOAN_EXCEEDS_UNALLOCATED_BALANCE` error code should instead handle `RESERVATION_CONSENT_REQUIRED` the same way `recordExpense`/`contribute` callers already do.

#### Scenario: Disbursement within the unallocated limit
- **WHEN** an account has a computed balance of ৳50,000 with ৳40,000 allocated to savings goals, and a user lends ৳10,000 to a borrower
- **THEN** the system accepts the disbursement, since exactly ৳10,000 is unallocated

#### Scenario: Disbursement exceeding the unallocated limit rejected
- **WHEN** an account has a computed balance of ৳50,000 with ৳40,000 allocated to savings goals, and a user attempts to lend ৳15,000 to a borrower
- **THEN** the system rejects the request, since only ৳10,000 remains unallocated, and creates no loan or transaction

## ADDED Requirements

### Requirement: Loan Disbursement May Dip Into Reserved Savings With Consent
The system SHALL allow a loan disbursement whose `amount` exceeds the source account's unallocated balance (computed balance minus the sum of that account's `GoalAllocationEvent` entries) to proceed only after the user completes the `goal-reservation-guard` capability's consent flow, selecting which goal(s) absorb the shortfall and whether each is a permanent reduction or a promised return by a date. The system SHALL NOT create the loan or its `LOAN_DISBURSEMENT` transaction until that consent is given, and SHALL evaluate this only after the source account's insufficient-balance check has already passed. Recording a repayment against the resulting loan SHALL NOT automatically resolve any `GoalReservationPromise` the disbursement created, regardless of which account the repayment credits — a promise is only ever resolved by an explicit return or write-off action against it.

#### Scenario: Disbursement within the unallocated limit proceeds unchanged
- **WHEN** an account has a computed balance of ৳50,000 with ৳40,000 allocated to savings goals, and a user lends ৳10,000 to a borrower
- **THEN** the system accepts the disbursement immediately, with no consent flow, since exactly ৳10,000 is unallocated

#### Scenario: Disbursement exceeding the unallocated limit requires consent
- **WHEN** an account has a computed balance of ৳50,000 with ৳40,000 allocated to savings goals, and a user attempts to lend ৳15,000 to a borrower
- **THEN** the system requires the user to complete the reservation consent flow, selecting which goal(s) absorb the ৳5,000 shortfall, before the loan or its `LOAN_DISBURSEMENT` transaction is created

#### Scenario: Consenting to the dip creates the loan and a promise
- **WHEN** a user completes the consent flow for a ৳5,000 shortfall, selecting one goal for the full amount and choosing "returning by" a future date
- **THEN** the system creates the loan, its `LOAN_DISBURSEMENT` transaction, a negative `GoalAllocationEvent` for that goal, and an open `GoalReservationPromise` for ৳5,000 due on that date

#### Scenario: Insufficient balance takes precedence over the reservation consent flow
- **WHEN** a user attempts to lend ৳15,000 from an account whose chronological running balance at that point would only be ৳10,500
- **THEN** the system rejects the disbursement with `INSUFFICIENT_BALANCE` and never evaluates or surfaces the reservation consent flow

#### Scenario: Repaying the loan does not touch the linked promise
- **WHEN** a borrower fully repays a loan whose disbursement had created an open `GoalReservationPromise`, crediting the same account the promise reserves against
- **THEN** the loan's status becomes `REPAID` and the `GoalReservationPromise` remains open with its `remainingAmount` unchanged, requiring an explicit return or write-off action to close
