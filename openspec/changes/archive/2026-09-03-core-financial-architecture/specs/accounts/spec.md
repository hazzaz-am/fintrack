## ADDED Requirements

### Requirement: Create Account
The system SHALL allow an authenticated user to create an account with a name, type, institution, opening balance, currency, and status.

#### Scenario: Successful account creation
- **WHEN** a user submits a valid account name, type, and opening balance
- **THEN** the system creates the account owned by that user with the given opening balance and no stored "current balance" field

### Requirement: Edit Account
The system SHALL allow an authenticated user to edit their own account's metadata (name, type, institution, currency, description, status), but SHALL NOT expose any way to directly set a "current balance" — balance is always derived.

#### Scenario: Edit account metadata
- **WHEN** a user updates an account's name or type
- **THEN** the system saves the change without altering any transaction history or opening balance

### Requirement: Archive Account
The system SHALL allow a user to archive an account instead of deleting it, preserving its transaction history.

#### Scenario: Archive account
- **WHEN** a user archives an account
- **THEN** the account's status becomes archived, it is excluded from "active accounts" totals, and its historical transactions remain queryable

### Requirement: Derived Account Balance
The system SHALL compute an account's balance at read time as `openingBalance + income − expenses + incoming transfers − outgoing transfers`, and SHALL NOT persist a mutable balance column that write paths update directly.

#### Scenario: Balance reflects income and expense
- **WHEN** a user has an account with opening balance ৳0, one income transaction of ৳80,000, and one expense transaction of ৳50,000
- **THEN** the computed balance for that account is ৳30,000

#### Scenario: Balance reflects transfers
- **WHEN** ৳5,000 is transferred from Account A to Account B
- **THEN** Account A's computed balance decreases by ৳5,000 and Account B's computed balance increases by ৳5,000, with no change to either account's income or expense totals

#### Scenario: Balance updates immediately after transaction edit
- **WHEN** a user edits the amount of a past expense transaction on an account
- **THEN** the account's computed balance reflects the edited amount on the very next read, with no separate reconciliation step required

### Requirement: List Accounts With Balances
The system SHALL return all of a user's active accounts together with each account's computed balance in a single request, without an N+1 query per account.

#### Scenario: List accounts
- **WHEN** a user with three accounts requests their account list
- **THEN** the system returns all three accounts, each with its computed balance, in one grouped query
