## ADDED Requirements

### Requirement: Record Income Transaction
The system SHALL allow a user to record an income transaction against one of their accounts, with an amount, date, income category, and optional description.

#### Scenario: Record salary income
- **WHEN** a user records an income transaction of ৳80,000 on their BRAC Bank account with category "Salary"
- **THEN** the system creates the transaction, and the account's computed balance and the period's total income both increase by ৳80,000

### Requirement: Record Expense Transaction
The system SHALL allow a user to record an expense transaction against one of their accounts, with an amount, date, expense category, and optional description.

#### Scenario: Record household expense
- **WHEN** a user records an expense transaction of ৳50,000 on their BRAC Bank account with category "Home"
- **THEN** the system creates the transaction, and the account's computed balance decreases by ৳50,000 while the period's total expenses increase by ৳50,000

### Requirement: Record Transfer Transaction
The system SHALL allow a user to transfer money between two of their own accounts as a single atomic operation, and SHALL NOT count transfers as income or expense.

#### Scenario: Successful transfer
- **WHEN** a user transfers ৳5,000 from BRAC Bank to bKash
- **THEN** the system records one transfer transaction such that BRAC Bank's computed balance decreases by ৳5,000, bKash's computed balance increases by ৳5,000, and neither the user's total income nor total expenses for the period change

#### Scenario: Transfer atomicity
- **WHEN** a transfer is being recorded and any part of the operation fails
- **THEN** the system leaves neither account's balance affected — the transfer either fully succeeds or has no effect

#### Scenario: Transfer to same account rejected
- **WHEN** a user attempts to transfer from an account to itself
- **THEN** the system rejects the request with a validation error

### Requirement: Edit and Delete Transactions
The system SHALL allow a user to edit or delete their own transactions, with all dependent computed values (account balances, period totals) reflecting the change immediately.

#### Scenario: Edit transaction amount
- **WHEN** a user changes a recorded expense from ৳5,000 to ৳4,000
- **THEN** the account's computed balance and the period's expense total both reflect the new ৳4,000 amount on the next read

#### Scenario: Delete transaction
- **WHEN** a user deletes a transaction
- **THEN** the transaction no longer contributes to any account balance or period total

### Requirement: Filter Transactions by Date Range
The system SHALL allow a user to filter their transactions by day, week, month, year, or a custom date range, using the transaction's `transactionDate`, not its `createdAt` record-creation timestamp.

#### Scenario: Filter by custom range
- **WHEN** a user filters transactions between two dates
- **THEN** the system returns only transactions whose `transactionDate` falls within that range, regardless of when the record was created

### Requirement: Monthly Aggregation
The system SHALL compute total income, total expenses, and net cash flow for a given period using database aggregation over transactions, not by loading all transactions into the application and summing them there.

#### Scenario: Monthly summary
- **WHEN** a user requests their September 2026 summary
- **THEN** the system returns total income, total expenses, and net cash flow computed via a database aggregate query scoped to that date range and that user
