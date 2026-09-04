# transactions-ui Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Transactions list shows the user's transaction ledger
The Transactions screen SHALL display the current user's transactions (income, expense, transfer, investment contribution, investment return) as a table with date, account, description, category, type, and amount, sourced from `TransactionService.list`.

#### Scenario: User with existing transactions
- **WHEN** an authenticated user with one or more transactions visits `/transactions`
- **THEN** the table shows each transaction's date, account, description, category, type, and amount, ordered most-recent first

#### Scenario: User with no transactions
- **WHEN** an authenticated user with zero transactions visits `/transactions`
- **THEN** an empty state is shown prompting them to record their first transaction, instead of an empty table

### Requirement: Transactions list supports search, filter, sort, and pagination
The Transactions screen SHALL let the user search by description, filter by account, category, transaction type, and date range (via the shared date-range resolver), sort by date or amount, and page through results.

#### Scenario: Filter by date range
- **WHEN** the user selects a month from the date-range filter
- **THEN** only transactions whose `transactionDate` falls within that month are shown

#### Scenario: Filter by account and category together
- **WHEN** the user filters by a specific account and a specific category
- **THEN** only transactions matching both filters are shown

#### Scenario: Search by description
- **WHEN** the user types a search term matching part of a transaction's description
- **THEN** only matching transactions are shown

#### Scenario: Pagination
- **WHEN** the filtered result set exceeds one page
- **THEN** the user can navigate to subsequent pages without the filter/search state resetting

### Requirement: User can record an income transaction
The Transactions screen SHALL provide a form to record an income transaction (account, category, amount, date, optional description) via a Server Action calling `TransactionService`.

#### Scenario: Valid income recorded
- **WHEN** the user submits the record-income form with a valid account, income category, amount, and date
- **THEN** the transaction is created and appears at the top of the list, and the funding account's displayed balance reflects the increase

#### Scenario: Invalid income rejected
- **WHEN** the user submits the record-income form with input that fails existing validation
- **THEN** field-level errors are shown and no transaction is created

### Requirement: User can record an expense transaction
The Transactions screen SHALL provide a form to record an expense transaction (account, category, amount, date, optional description) via a Server Action calling `TransactionService`.

#### Scenario: Valid expense recorded
- **WHEN** the user submits the record-expense form with a valid account, expense category, amount, and date
- **THEN** the transaction is created and appears at the top of the list, and the account's displayed balance reflects the decrease

### Requirement: User can record a transfer between their own accounts
The Transactions screen SHALL provide a form to transfer money between two of the user's own accounts, via a Server Action calling `TransactionService.recordTransfer`.

#### Scenario: Valid transfer recorded
- **WHEN** the user submits the transfer form with a source account, destination account, and amount
- **THEN** one transfer transaction is created, both accounts' displayed balances update accordingly, and the transfer does not appear as income or expense anywhere in the list's type column

#### Scenario: Transfer to same account rejected in the UI
- **WHEN** the user selects the same account as both source and destination
- **THEN** the form shows a validation error and does not submit

### Requirement: User can edit a transaction
The Transactions screen SHALL allow editing an existing transaction's editable fields (amount, category, date, description) via a Server Action calling `TransactionService.update`. Reassigning a transaction to a different account is not supported — `TransactionService.update` does not support it, so a transaction recorded against the wrong account must be deleted and re-recorded.

#### Scenario: Valid edit
- **WHEN** the user edits a transaction's amount and submits
- **THEN** the list reflects the new amount and any account balance shown elsewhere on the page updates on next read

### Requirement: User can delete a transaction
The Transactions screen SHALL allow deleting a transaction, after explicit confirmation, via a Server Action calling `TransactionService.delete`.

#### Scenario: Deleting a transaction
- **WHEN** the user confirms deleting a transaction
- **THEN** the transaction no longer appears in the list

#### Scenario: Deletion requires confirmation
- **WHEN** the user initiates deleting a transaction but does not confirm
- **THEN** the transaction remains in the list unchanged

### Requirement: Transaction filters remain usable at phone widths
The transaction filter form SHALL default to a single-column layout below the `sm` breakpoint instead of a cramped two-up grid, widening to multi-column only at larger breakpoints.

#### Scenario: Filter form viewed at 375px width
- **WHEN** the transaction filters form is loaded at a 375px viewport width
- **THEN** each field (search, type, date range, account, category, custom from/to, sort) occupies its own full-width row, and the Apply/Clear actions remain reachable without horizontal scrolling

### Requirement: Transaction list remains usable at phone widths
The transaction list rows SHALL remain fully readable at phone widths, with description, account/category context, and amount all visible without horizontal overflow.

#### Scenario: Transaction list viewed at 375px width
- **WHEN** the transaction list is loaded at a 375px viewport width
- **THEN** each row's title, subtitle, and trailing amount/actions remain visible without clipping or requiring horizontal scroll
