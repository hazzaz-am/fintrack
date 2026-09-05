## MODIFIED Requirements

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
