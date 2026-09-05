## MODIFIED Requirements

### Requirement: User can record an income transaction
The Transactions screen SHALL provide a form to record an income transaction (account, category, amount, date, optional description) via a Server Action calling `TransactionService`. The form SHALL validate fields client-side before submission, using the same schema the Server Action validates with.

#### Scenario: Valid income recorded
- **WHEN** the user submits the record-income form with a valid account, income category, amount, and date
- **THEN** the transaction is created and appears at the top of the list, and the funding account's displayed balance reflects the increase

#### Scenario: Invalid income rejected
- **WHEN** the user submits the record-income form with input that fails existing validation
- **THEN** field-level errors are shown and no transaction is created

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the record-income form (e.g. an empty account or non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can record an expense transaction
The Transactions screen SHALL provide a form to record an expense transaction (account, category, amount, date, optional description) via a Server Action calling `TransactionService`. The form SHALL validate fields client-side before submission, using the same schema the Server Action validates with.

#### Scenario: Valid expense recorded
- **WHEN** the user submits the record-expense form with a valid account, expense category, amount, and date
- **THEN** the transaction is created and appears at the top of the list, and the account's displayed balance reflects the decrease

#### Scenario: Invalid expense rejected
- **WHEN** the user submits the record-expense form with input that fails existing validation
- **THEN** field-level errors are shown and no transaction is created

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the record-expense form (e.g. an empty category or non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can record a transfer between their own accounts
The Transactions screen SHALL provide a form to transfer money between two of the user's own accounts, via a Server Action calling `TransactionService.recordTransfer`. The form SHALL validate fields client-side before submission, using the same schema-based validation as every other migrated form, including the same-account check.

#### Scenario: Valid transfer recorded
- **WHEN** the user submits the transfer form with a source account, destination account, and amount
- **THEN** one transfer transaction is created, both accounts' displayed balances update accordingly, and the transfer does not appear as income or expense anywhere in the list's type column

#### Scenario: Transfer to same account rejected in the UI
- **WHEN** the user selects the same account as both source and destination
- **THEN** the form shows a validation error and does not submit

### Requirement: User can edit a transaction
The Transactions screen SHALL allow editing an existing transaction's editable fields (amount, category, date, description) via a Server Action calling `TransactionService.update`. Reassigning a transaction to a different account is not supported — `TransactionService.update` does not support it, so a transaction recorded against the wrong account must be deleted and re-recorded. The edit form SHALL validate fields client-side before submission, using the same schema as recording a transaction of that type.

#### Scenario: Valid edit
- **WHEN** the user edits a transaction's amount and submits
- **THEN** the list reflects the new amount and any account balance shown elsewhere on the page updates on next read

#### Scenario: Invalid edit
- **WHEN** the user edits a transaction's field to a value that fails validation and submits
- **THEN** a field-level error is shown and the transaction is not updated

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the edit form (e.g. a non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form
