## MODIFIED Requirements

### Requirement: Record Expense Transaction
The system SHALL allow a user to record an expense transaction against one of their accounts, with an amount, date, expense category, and optional description. The system SHALL reject the transaction if recording it would cause the account's chronologically-ordered running balance (replaying `openingBalance` forward through all of the account's transactions in `transactionDate`, then `createdAt`, then `id` order) to go negative at any point, counting the expense's `amount` plus any `vatAmount` as the amount deducted.

#### Scenario: Record household expense
- **WHEN** a user records an expense transaction of ৳50,000 on their BRAC Bank account with category "Home"
- **THEN** the system creates the transaction, and the account's computed balance decreases by ৳50,000 while the period's total expenses increase by ৳50,000

#### Scenario: Expense rejected for insufficient balance
- **WHEN** a user attempts to record a ৳50,000 expense on an account whose chronological running balance at that point would only be ৳5,000
- **THEN** the system rejects the request with an `INSUFFICIENT_BALANCE` error and creates no transaction

#### Scenario: Expense with VAT counted against balance
- **WHEN** a user attempts to record a ৳4,500 expense with ৳500 `vatAmount` on an account with a ৳4,800 chronological running balance at that point
- **THEN** the system rejects the request with an `INSUFFICIENT_BALANCE` error, because the combined ৳5,000 deduction exceeds the ৳4,800 available

### Requirement: Record Transfer Transaction
The system SHALL allow a user to transfer money between two of their own accounts as a single atomic operation, and SHALL NOT count transfers as income or expense. The system SHALL reject the transfer if it would cause the source account's chronologically-ordered running balance to go negative at any point, counting the transferred amount plus any `vatAmount` as the amount deducted from the source account; no such check applies to the destination account.

#### Scenario: Successful transfer
- **WHEN** a user transfers ৳5,000 from BRAC Bank to bKash
- **THEN** the system records one transfer transaction such that BRAC Bank's computed balance decreases by ৳5,000, bKash's computed balance increases by ৳5,000, and neither the user's total income nor total expenses for the period change

#### Scenario: Transfer atomicity
- **WHEN** a transfer is being recorded and any part of the operation fails
- **THEN** the system leaves neither account's balance affected — the transfer either fully succeeds or has no effect

#### Scenario: Transfer to same account rejected
- **WHEN** a user attempts to transfer from an account to itself
- **THEN** the system rejects the request with a validation error

#### Scenario: Transfer rejected for insufficient source balance
- **WHEN** a user attempts to transfer ৳50,000 from BRAC Bank to bKash, but BRAC Bank's chronological running balance at that point would only be ৳5,000
- **THEN** the system rejects the request with an `INSUFFICIENT_BALANCE` error, and neither account's balance changes

### Requirement: Edit and Delete Transactions
The system SHALL allow a user to edit or delete their own transactions, with all dependent computed values (account balances, period totals) reflecting the change immediately. The system SHALL reject an edit if the resulting change would cause any affected account's chronologically-ordered running balance to go negative at any point. The system SHALL reject deleting an `INCOME`, transfer-in, or `INVESTMENT_RETURN` transaction if removing it would cause any affected account's chronologically-ordered running balance to go negative at any point; deleting an `EXPENSE`, transfer-out, or `INVESTMENT_CONTRIBUTION` transaction is never rejected on balance grounds, since removing an outflow can only increase the account's balance at every point in its history.

#### Scenario: Edit transaction amount
- **WHEN** a user changes a recorded expense from ৳5,000 to ৳4,000
- **THEN** the account's computed balance and the period's expense total both reflect the new ৳4,000 amount on the next read

#### Scenario: Delete transaction
- **WHEN** a user deletes an expense transaction
- **THEN** the transaction no longer contributes to any account balance or period total

#### Scenario: Edit rejected for insufficient balance
- **WHEN** a user attempts to increase a recorded expense from ৳4,000 to ৳50,000, but the account's chronological running balance at that point would only support ৳5,000
- **THEN** the system rejects the edit with an `INSUFFICIENT_BALANCE` error and leaves the transaction unchanged at ৳4,000

#### Scenario: Delete of inflow rejected for insufficient balance
- **WHEN** a user attempts to delete a ৳50,000 `INCOME` transaction, and removing it would cause the account's chronological running balance to go negative at some later point because of expenses recorded against it since
- **THEN** the system rejects the deletion with an `INSUFFICIENT_BALANCE` error and leaves the transaction in place

#### Scenario: Delete of outflow never rejected on balance grounds
- **WHEN** a user deletes an `EXPENSE`, transfer-out, or `INVESTMENT_CONTRIBUTION` transaction
- **THEN** the system does not perform a balance-sufficiency check for the deletion, since removing an outflow can only raise the account's balance at every point in its history

## ADDED Requirements

### Requirement: Transaction Date Bound
The system SHALL reject any `INCOME`, `EXPENSE`, or `TRANSFER` transaction whose `transactionDate` is later than the current date, both when creating and when editing a transaction.

#### Scenario: Future-dated transaction rejected
- **WHEN** a user attempts to record an expense with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no transaction

#### Scenario: Editing a transaction to a future date rejected
- **WHEN** a user attempts to edit an existing transaction's `transactionDate` to a date later than today
- **THEN** the system rejects the edit with a validation error and leaves the transaction's date unchanged

#### Scenario: Backdated transaction still allowed
- **WHEN** a user records an expense with a `transactionDate` in the past
- **THEN** the system accepts the date (subject to the balance-sufficiency requirements above)
