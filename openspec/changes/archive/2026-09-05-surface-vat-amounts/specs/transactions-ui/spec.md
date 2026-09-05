## MODIFIED Requirements

### Requirement: Transactions list shows the user's transaction ledger
The Transactions screen SHALL display the current user's transactions (income, expense, transfer, investment contribution, investment return) as a table with date, account, description, category, type, and amount, sourced from `TransactionService.list`. When a transaction has a non-null `vatAmount`, the amount display SHALL also show the VAT amount and a totaled figure equal to `amount + vatAmount`, matching the actual impact on the account's balance. When `vatAmount` is null, the amount displays exactly as it does today with no additional lines.

#### Scenario: User with existing transactions
- **WHEN** an authenticated user with one or more transactions visits `/transactions`
- **THEN** the table shows each transaction's date, account, description, category, type, and amount, ordered most-recent first

#### Scenario: User with no transactions
- **WHEN** an authenticated user with zero transactions visits `/transactions`
- **THEN** an empty state is shown prompting them to record their first transaction, instead of an empty table

#### Scenario: Transaction with VAT shows the VAT amount and total
- **WHEN** a listed expense transaction has an `amount` of ৳100 and a `vatAmount` of ৳15
- **THEN** the row shows ৳100 as the amount, ৳15 as VAT, and ৳115 as the totaled figure

#### Scenario: Transaction without VAT is unaffected
- **WHEN** a listed transaction has no `vatAmount` recorded
- **THEN** the row shows only its `amount`, with no VAT line or additional total, exactly as before this change
