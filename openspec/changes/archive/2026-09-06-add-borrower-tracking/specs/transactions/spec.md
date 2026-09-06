## MODIFIED Requirements

### Requirement: Edit and Delete Transactions
The system SHALL allow a user to edit or delete their own transactions, with all dependent computed values (account balances, period totals) reflecting the change immediately. The system SHALL reject an edit if the resulting change would cause any affected account's chronologically-ordered running balance to go negative at any point. The system SHALL reject deleting an `INCOME`, transfer-in, or `INVESTMENT_RETURN` transaction if removing it would cause any affected account's chronologically-ordered running balance to go negative at any point; deleting an `EXPENSE`, transfer-out, or `INVESTMENT_CONTRIBUTION` transaction is never rejected on balance grounds, since removing an outflow can only increase the account's balance at every point in its history. The system SHALL NOT allow a `LOAN_DISBURSEMENT` transaction to be deleted, and SHALL NOT allow its `amount` to be edited, regardless of the linked loan's status — this is the one transaction type with no delete path and no amount-edit path.

#### Scenario: Edit transaction amount
- **WHEN** a user changes a recorded expense from ৳5,000 to ৳4,000
- **THEN** the account's computed balance and the period's expense total both reflect the new ৳4,000 amount on the next read

#### Scenario: Delete transaction
- **WHEN** a user deletes a transaction
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

#### Scenario: Loan disbursement transaction cannot be deleted
- **WHEN** a user attempts to delete a `LOAN_DISBURSEMENT` transaction, whether its loan is Open, Partially Repaid, Repaid, or Written Off
- **THEN** the system rejects the deletion and the transaction remains in place

#### Scenario: Loan disbursement amount cannot be edited
- **WHEN** a user attempts to edit the `amount` of a `LOAN_DISBURSEMENT` transaction
- **THEN** the system rejects the edit and the transaction's amount remains unchanged

### Requirement: Transaction Date Bound
The system SHALL reject any `INCOME`, `EXPENSE`, or `TRANSFER` transaction whose `transactionDate` is later than the current date, both when creating and when editing a transaction. The system SHALL also reject any `LOAN_DISBURSEMENT` or `LOAN_REPAYMENT` transaction whose `transactionDate` is later than the current date when creating it.

#### Scenario: Future-dated transaction rejected
- **WHEN** a user attempts to record an expense with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no transaction

#### Scenario: Editing a transaction to a future date rejected
- **WHEN** a user attempts to edit an existing transaction's `transactionDate` to a date later than today
- **THEN** the system rejects the edit with a validation error and leaves the transaction's date unchanged

#### Scenario: Backdated transaction still allowed
- **WHEN** a user records an expense with a `transactionDate` in the past
- **THEN** the system accepts the date (subject to the balance-sufficiency requirements above)

#### Scenario: Future-dated loan disbursement rejected
- **WHEN** a user attempts to disburse a loan with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no loan or transaction

#### Scenario: Future-dated loan repayment rejected
- **WHEN** a user attempts to record a loan repayment with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no transaction

#### Scenario: A loan's due date is not bound by this requirement
- **WHEN** a user sets or changes a loan's `dueDate` to a date in the future
- **THEN** the system accepts it without restriction, since `dueDate` is a repayment deadline, not a `transactionDate`

## ADDED Requirements

### Requirement: Record Loan Disbursement Transaction
The system SHALL support a `LOAN_DISBURSEMENT` transaction type carrying an `accountId` and a `loanId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`. The system SHALL NOT count `LOAN_DISBURSEMENT` transactions as income or expense.

#### Scenario: Loan disbursement recorded
- **WHEN** the system records a `LOAN_DISBURSEMENT` of ৳5,000 against BRAC Bank and a given loan
- **THEN** the transaction is created with `accountId` and `loanId` set, no category, and it does not contribute to the period's income or expense totals

### Requirement: Record Loan Repayment Transaction
The system SHALL support a `LOAN_REPAYMENT` transaction type carrying an `accountId` and a `loanId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`. The system SHALL NOT count `LOAN_REPAYMENT` transactions as income or expense.

#### Scenario: Loan repayment recorded
- **WHEN** the system records a `LOAN_REPAYMENT` of ৳2,000 against bKash and a given loan
- **THEN** the transaction is created with `accountId` and `loanId` set, no category, and it does not contribute to the period's income or expense totals
