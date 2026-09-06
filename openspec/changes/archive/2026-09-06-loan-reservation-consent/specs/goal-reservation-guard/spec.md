## MODIFIED Requirements

### Requirement: Detect a Reserved-Funds Shortfall on New Outflow Transactions
The system SHALL, for every new `EXPENSE`, `INVESTMENT_CONTRIBUTION`, `LOAN_DISBURSEMENT`, or outgoing `TRANSFER` transaction, compute whether `amount` plus any `vatAmount` exceeds the source account's unallocated balance (computed balance minus the sum of that account's `GoalAllocationEvent` entries), and SHALL perform this check only after the transaction has already passed the existing insufficient-balance check for that account.

#### Scenario: Shortfall detected on an expense
- **WHEN** a user attempts a ৳700 expense on an account with ৳500 unallocated
- **THEN** the system computes a ৳200 shortfall and requires the reservation consent flow before the transaction can be created

#### Scenario: Shortfall detected on a loan disbursement
- **WHEN** a user attempts to lend ৳700 to a borrower from an account with ৳500 unallocated
- **THEN** the system computes a ৳200 shortfall and requires the reservation consent flow before the loan and its `LOAN_DISBURSEMENT` transaction can be created

#### Scenario: No shortfall, transaction proceeds unchanged
- **WHEN** a user attempts a ৳400 expense on an account with ৳500 unallocated
- **THEN** the system creates the transaction immediately with no consent flow, identical to current behavior

#### Scenario: Insufficient balance takes precedence
- **WHEN** a user attempts a ৳15,000 expense on an account whose chronological running balance at that point would only be ৳10,500
- **THEN** the system rejects the transaction with `INSUFFICIENT_BALANCE` and never evaluates or surfaces the reservation consent flow

#### Scenario: VAT counts toward the shortfall
- **WHEN** a user attempts a ৳450 expense with ৳100 `vatAmount` on an account with ৳500 unallocated
- **THEN** the system computes the combined ৳550 against the ৳500 unallocated balance and detects a ৳50 shortfall
