# borrowers Specification

## Purpose

Borrower profile CRUD, loan disbursement/repayment/write-off, and derived loan/borrower outstanding computation.

## Requirements

### Requirement: Create Borrower Profile
The system SHALL allow a user to create a `Borrower` profile with a name and optional notes, reusable across many loans over time.

#### Scenario: Create a borrower
- **WHEN** a user creates a borrower named "Rafi"
- **THEN** the system creates the borrower owned by that user with zero loans and zero total outstanding

### Requirement: Edit Borrower Profile
The system SHALL allow a user to edit their own borrower's name and notes. The system SHALL NOT provide any way to delete or archive a borrower.

#### Scenario: Edit borrower notes
- **WHEN** a user updates a borrower's notes
- **THEN** the system saves the change without altering any of that borrower's existing loans or repayments

#### Scenario: Edit rejects unowned borrower
- **WHEN** a user attempts to edit a borrower that does not belong to them
- **THEN** the system rejects the request with a not-found error

### Requirement: Disburse a Loan Against a Borrower
The system SHALL allow a user to disburse a loan to one of their borrowers from one of their own accounts, recording an `amount`, `sourceAccountId`, `disbursedDate`, and `dueDate`, and creating exactly one `LOAN_DISBURSEMENT` transaction atomically with the loan. The system SHALL reject the disbursement if it would fail the account's existing chronological insufficient-balance check, checked before any loan-specific validation.

#### Scenario: Successful disbursement
- **WHEN** a user lends ৳5,000 to borrower "Rafi" from their BRAC Bank account with a due date two weeks out
- **THEN** the system creates the loan with status `OPEN`, a `LOAN_DISBURSEMENT` transaction of ৳5,000 against BRAC Bank, and BRAC Bank's computed balance decreases by ৳5,000

#### Scenario: Insufficient balance takes precedence over the reservation consent flow
- **WHEN** a user attempts to lend ৳15,000 from an account whose chronological running balance at that point would only be ৳10,500
- **THEN** the system rejects the disbursement with `INSUFFICIENT_BALANCE` and never evaluates or surfaces the reservation consent flow

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

### Requirement: Loan Amount and Source Account Are Immutable
The system SHALL NOT allow a loan's `amount` or `sourceAccountId` to be changed after creation, and SHALL NOT allow a loan or its `LOAN_DISBURSEMENT` transaction to be deleted, regardless of the loan's status.

#### Scenario: No edit path for loan amount
- **WHEN** a user views an existing loan
- **THEN** the system offers no action to change its amount or source account, only its `dueDate`

#### Scenario: No delete path for a loan
- **WHEN** a user views an existing loan, open or resolved
- **THEN** the system offers no action to delete the loan or its disbursement transaction

### Requirement: Change a Loan's Due Date
The system SHALL allow a user to change an existing loan's `dueDate` to any date, regardless of the loan's status.

#### Scenario: Extend a due date
- **WHEN** a user changes an open loan's `dueDate` from a date already passed to two weeks from now
- **THEN** the system saves the new due date, and the loan is no longer reported as overdue

### Requirement: Record a Loan Repayment
The system SHALL allow a user to record a repayment against an open or partially-repaid loan for any amount up to its current outstanding amount, crediting an account of the user's choosing at the time of the repayment (not required to match the loan's `sourceAccountId`), creating a `LOAN_REPAYMENT` transaction and decreasing the loan's derived outstanding amount by that amount.

#### Scenario: Partial repayment
- **WHEN** a user records a ৳2,000 repayment against a ৳5,000 loan, crediting their bKash account
- **THEN** the loan's outstanding amount becomes ৳3,000, its status becomes `PARTIALLY_REPAID`, bKash's computed balance increases by ৳2,000, and the source account of the original disbursement is unaffected

#### Scenario: Repayment completes the loan
- **WHEN** a user's cumulative repayments against a loan bring its outstanding amount to zero
- **THEN** the loan's status becomes `REPAID`

#### Scenario: Repayment cannot exceed outstanding amount
- **WHEN** a user attempts to record a repayment greater than a loan's current outstanding amount
- **THEN** the system rejects the request and creates no transaction

### Requirement: Write Off a Loan
The system SHALL allow a user to write off any remaining outstanding amount on a loan at any time, closing it with status `WRITTEN_OFF` and creating no further transaction. The system SHALL NOT reverse or delete any `LoanRepayment` already recorded against a written-off loan.

#### Scenario: Write off remaining balance
- **WHEN** a user writes off a loan with ৳3,000 still outstanding
- **THEN** the loan's status becomes `WRITTEN_OFF`, its outstanding amount remains ৳3,000 for record-keeping, and no additional transaction is created

#### Scenario: Written-off loan is not repayable afterward
- **WHEN** a user views a loan with status `WRITTEN_OFF`
- **THEN** the system offers no repayment action for that loan

### Requirement: Derived Loan Outstanding and Status
The system SHALL compute a loan's outstanding amount at read time as its disbursed amount minus the sum of its `LOAN_REPAYMENT` transactions, and SHALL NOT persist a mutable "current outstanding" column that write paths update directly. The system SHALL derive status among `OPEN`, `PARTIALLY_REPAID`, and `REPAID` from this computation, except `WRITTEN_OFF`, which is a stored terminal state set only by the write-off action.

#### Scenario: Outstanding reflects repayment history
- **WHEN** a ৳5,000 loan has two repayments of ৳1,000 each recorded against it
- **THEN** the computed outstanding amount is ৳3,000 on the very next read, with no separate reconciliation step required

### Requirement: Overdue Loan Reporting
The system SHALL report a loan as overdue when its `dueDate` has passed, its outstanding amount is greater than zero, and its status is not `WRITTEN_OFF`. The system SHALL NOT store an "overdue" value — it SHALL be computed at read time and SHALL clear immediately once the loan is fully repaid or written off, with no manual dismissal step and no automatic expiry, removal, or status change of the loan itself.

#### Scenario: Loan past due date with balance remaining
- **WHEN** a loan's `dueDate` was 10 days ago and its outstanding amount is still ৳3,000
- **THEN** the system reports it as overdue by 10 days

#### Scenario: Overdue clears on full repayment
- **WHEN** a user's repayment brings an overdue loan's outstanding amount to zero
- **THEN** the loan no longer appears in overdue reporting on the very next read

#### Scenario: Overdue clears on write-off
- **WHEN** a user writes off an overdue loan
- **THEN** the loan no longer appears in overdue reporting on the very next read

### Requirement: Borrower Aggregate Outstanding
The system SHALL report, for each borrower, the sum of outstanding amounts across all of that borrower's loans, computed via database aggregation rather than loading all loans into the application and summing them there.

#### Scenario: Borrower with multiple loans
- **WHEN** a borrower has one loan with ৳3,000 outstanding and another fully repaid loan
- **THEN** the system reports that borrower's total outstanding as ৳3,000
