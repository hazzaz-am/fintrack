# transactions Specification

## Purpose

Income/Expense/Transfer CRUD, transfer atomicity, date-range filtering, and monthly aggregation.

## Requirements

### Requirement: Record Income Transaction
The system SHALL allow a user to record an income transaction against one of their accounts, with an amount, date, income category, and optional description.

#### Scenario: Record salary income
- **WHEN** a user records an income transaction of ৳80,000 on their BRAC Bank account with category "Salary"
- **THEN** the system creates the transaction, and the account's computed balance and the period's total income both increase by ৳80,000

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

### Requirement: Filter Transactions by Date Range
The system SHALL allow a user to filter their transactions by day, week, month, year, or a custom date range, using the transaction's `transactionDate`, not its `createdAt` record-creation timestamp.

#### Scenario: Filter by custom range
- **WHEN** a user filters transactions between two dates
- **THEN** the system returns only transactions whose `transactionDate` falls within that range, regardless of when the record was created

### Requirement: Monthly Aggregation
The system SHALL compute total income, total expenses, and net cash flow for a given period using database aggregation over transactions, not by loading all transactions into the application and summing them there. The total expenses figure SHALL include any `vatAmount` recorded against `EXPENSE` transactions in the period, so it reflects the full amount deducted from the paying account.

#### Scenario: Monthly summary
- **WHEN** a user requests their September 2026 summary
- **THEN** the system returns total income, total expenses, and net cash flow computed via a database aggregate query scoped to that date range and that user

#### Scenario: Expense total includes VAT
- **WHEN** a user's September 2026 expenses include a ৳100 transaction with ৳15 of VAT
- **THEN** the period's total expenses figure includes both the ৳100 and the ৳15, and net cash flow (income − expenses) reflects the same ৳115

#### Scenario: Expense without VAT is unaffected
- **WHEN** a user's expense transaction has no `vatAmount` recorded
- **THEN** it contributes only its `amount` to the period's total expenses, exactly as before this change

### Requirement: Record Investment Contribution Transaction
The system SHALL support an `INVESTMENT_CONTRIBUTION` transaction type carrying an `accountId` and an `investmentId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`. The system SHALL NOT count `INVESTMENT_CONTRIBUTION` transactions as income or expense.

#### Scenario: Investment contribution recorded
- **WHEN** the system records an `INVESTMENT_CONTRIBUTION` of ৳200,000 against BRAC Bank and a given investment
- **THEN** the transaction is created with `accountId` and `investmentId` set, no category, and it does not contribute to the period's income or expense totals

### Requirement: Record Investment Return Transaction
The system SHALL support an `INVESTMENT_RETURN` transaction type carrying an `accountId` and an `investmentId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`, representing only the principal portion of an investment payout. The system SHALL NOT count `INVESTMENT_RETURN` transactions as income or expense.

#### Scenario: Investment return recorded
- **WHEN** the system records an `INVESTMENT_RETURN` of ৳200,000 against BRAC Bank and a given investment
- **THEN** the transaction is created with `accountId` and `investmentId` set, no category, and it does not contribute to the period's income or expense totals

#### Scenario: Profit is a separate income transaction
- **WHEN** an investment payout includes profit above principal
- **THEN** the system records that profit as a separate ordinary `INCOME` transaction under the "Investment Return" category, distinct from the `INVESTMENT_RETURN` transaction

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
