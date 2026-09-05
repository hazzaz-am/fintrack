# accounts-ui Specification

## Purpose

TBD - created by archiving change web-app-foundation. Update Purpose after archive.

## Requirements

### Requirement: Accounts list shows every active account with its derived balance
The Accounts screen SHALL display each of the current user's active accounts with its name, institution, type, currency, status, and current balance as computed by `AccountService.listWithBalances`.

#### Scenario: User with existing accounts
- **WHEN** an authenticated user with one or more active accounts visits `/accounts`
- **THEN** each account is displayed with its current derived balance, not a stored/stale value

#### Scenario: User with no accounts
- **WHEN** an authenticated user with zero accounts visits `/accounts`
- **THEN** an empty state is shown prompting them to create their first account, instead of an empty list

### Requirement: User can create an account
The Accounts screen SHALL provide a form to create a new account using the existing account validation and service. The form SHALL validate fields client-side, using the same schema, before submission.

#### Scenario: Valid account creation
- **WHEN** the user submits the create-account form with a valid name, type, currency, and opening balance
- **THEN** a new account is created and appears in the list with a balance equal to its opening balance

#### Scenario: Invalid account creation
- **WHEN** the user submits the create-account form with input that fails existing validation
- **THEN** field-level errors are shown and no account is created

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the create-account form (e.g. leaves the name empty)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can edit an account
The Accounts screen SHALL allow editing an existing account's editable fields (name, institution, type, currency, description) without affecting its balance. The edit form SHALL validate fields client-side, using the same schema as creation, before submission.

#### Scenario: Valid edit
- **WHEN** the user edits an account's name or other editable field and submits
- **THEN** the account reflects the new values and its derived balance is unchanged

#### Scenario: Invalid edit
- **WHEN** the user edits an account's field to a value that fails validation and submits
- **THEN** field-level errors are shown and the account is not updated

### Requirement: User can archive an account
The Accounts screen SHALL allow archiving an account, after explicit confirmation, removing it from the active list.

#### Scenario: Archiving an account
- **WHEN** the user confirms archiving an account
- **THEN** the account's status becomes archived and it no longer appears in the active accounts list

#### Scenario: Archiving requires confirmation
- **WHEN** the user initiates archiving an account but does not confirm
- **THEN** the account remains active and unchanged

### Requirement: Accounts screen remains usable at phone widths
The accounts list and the create/edit account forms SHALL remain fully usable at phone widths without horizontal scrolling or clipped balances.

#### Scenario: Accounts screen viewed at 375px width
- **WHEN** the Accounts screen is loaded at a 375px viewport width
- **THEN** each account row's name and balance remain visible without clipping, and the create/edit account form fields stack in a single column
