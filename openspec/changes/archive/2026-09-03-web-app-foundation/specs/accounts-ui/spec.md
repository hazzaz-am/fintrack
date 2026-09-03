## ADDED Requirements

### Requirement: Accounts list shows every active account with its derived balance
The Accounts screen SHALL display each of the current user's active accounts with its name, institution, type, currency, status, and current balance as computed by `AccountService.listWithBalances`.

#### Scenario: User with existing accounts
- **WHEN** an authenticated user with one or more active accounts visits `/accounts`
- **THEN** each account is displayed with its current derived balance, not a stored/stale value

#### Scenario: User with no accounts
- **WHEN** an authenticated user with zero accounts visits `/accounts`
- **THEN** an empty state is shown prompting them to create their first account, instead of an empty list

### Requirement: User can create an account
The Accounts screen SHALL provide a form to create a new account using the existing account validation and service.

#### Scenario: Valid account creation
- **WHEN** the user submits the create-account form with a valid name, type, currency, and opening balance
- **THEN** a new account is created and appears in the list with a balance equal to its opening balance

#### Scenario: Invalid account creation
- **WHEN** the user submits the create-account form with input that fails existing validation
- **THEN** field-level errors are shown and no account is created

### Requirement: User can edit an account
The Accounts screen SHALL allow editing an existing account's editable fields (name, institution, type, currency, description) without affecting its balance.

#### Scenario: Valid edit
- **WHEN** the user edits an account's name or other editable field and submits
- **THEN** the account reflects the new values and its derived balance is unchanged

### Requirement: User can archive an account
The Accounts screen SHALL allow archiving an account, after explicit confirmation, removing it from the active list.

#### Scenario: Archiving an account
- **WHEN** the user confirms archiving an account
- **THEN** the account's status becomes archived and it no longer appears in the active accounts list

#### Scenario: Archiving requires confirmation
- **WHEN** the user initiates archiving an account but does not confirm
- **THEN** the account remains active and unchanged
