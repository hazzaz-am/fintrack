## ADDED Requirements

### Requirement: User can create a recurring transaction template
The system SHALL allow a user to create a `RecurringTransaction` template with a name, amount, account, category, type (`INCOME` or `EXPENSE`), frequency (`WEEKLY`, `MONTHLY`, `QUARTERLY`, or `YEARLY`), start date, and optional end date. The account and category SHALL belong to the requesting user, and the category's type SHALL match the template's type.

#### Scenario: Creating a monthly expense template
- **WHEN** the user creates a template named "Home" with type Expense, amount ৳50,000, monthly frequency, an account, and a category
- **THEN** the template is created with status Active

#### Scenario: Creating a template with a mismatched category type
- **WHEN** the user submits a template with type Income but selects a category whose type is Expense
- **THEN** the system rejects the request with a validation error and no template is created

#### Scenario: Creating a template referencing another user's account
- **WHEN** the user submits a template referencing an account they do not own
- **THEN** the system rejects the request with a not-found error

### Requirement: A recurring transaction template does not support Transfer
The system SHALL restrict `RecurringTransaction.type` to `INCOME` or `EXPENSE` only; recurring transfers are not supported.

#### Scenario: Attempting to create a recurring transfer
- **WHEN** the user submits a template with type `TRANSFER`
- **THEN** the system rejects the request with a validation error

### Requirement: Due-ness is computed from the template's schedule, not stored
The system SHALL compute whether a template is currently due by deriving the current scheduled slot from its `startDate` and `frequency` relative to today, and checking whether a `Transaction` linked to that template already falls within that slot. No field stores a mutable "next occurrence" value.

#### Scenario: A newly created template becomes due
- **WHEN** a template's `startDate` is today or earlier and no transaction has ever been generated from it
- **THEN** the template appears as due, with its current scheduled slot's start date as the suggested transaction date

#### Scenario: A template already confirmed for the current slot is not due
- **WHEN** a `Transaction` linked to the template has a `transactionDate` within the current scheduled slot
- **THEN** the template does not appear as due until the next slot begins

#### Scenario: A future-dated template is not yet due
- **WHEN** a template's `startDate` is in the future
- **THEN** the template does not appear as due

#### Scenario: An inactive template is never due
- **WHEN** a template's status is `INACTIVE`
- **THEN** the template is excluded from the due list regardless of its schedule

#### Scenario: A template past its end date is not due
- **WHEN** a template has an `endDate` and the current scheduled slot starts after that date
- **THEN** the template does not appear as due

### Requirement: Missed periods are never backfilled
The system SHALL surface at most one due slot per template at any time. Periods that elapsed without a confirmation SHALL NOT be queued, counted, or offered for retroactive creation.

#### Scenario: Template unconfirmed for several elapsed periods
- **WHEN** a monthly template's last confirmation is three months old
- **THEN** the template appears as due exactly once, for the current slot only — not three times

### Requirement: User can confirm a due template into a real transaction
The system SHALL allow the user to confirm a due template, creating a real `Transaction` of the template's type with the template's account, category, and amount pre-filled (all editable before saving), linked to the template via `recurringTransactionId`.

#### Scenario: Confirming a due expense template
- **WHEN** the user confirms a due "Home" expense template
- **THEN** an `EXPENSE` transaction is created with the template's account, category, and amount, linked to the template, and the template no longer appears as due until its next slot

#### Scenario: Confirming with an edited amount
- **WHEN** the user confirms a due template but changes the amount before saving
- **THEN** the created transaction reflects the edited amount, not the template's stored amount

### Requirement: A due template is never confirmed automatically
The system SHALL NOT create a `Transaction` from a due template without an explicit user confirmation action. No background process or page-load side effect inserts recurring transactions.

#### Scenario: Opening the app with a due template
- **WHEN** the user opens the application and a template is currently due
- **THEN** no transaction is created until the user explicitly confirms it

### Requirement: Editing a template only affects future occurrences
The system SHALL apply template edits only to future due-slot computation. Editing a template's amount, account, category, frequency, or dates SHALL NOT modify any `Transaction` previously generated from it.

#### Scenario: Amount increased after prior confirmations
- **WHEN** the user edits a template's amount from ৳48,000 to ৳50,000
- **THEN** previously generated transactions retain their original recorded amounts, and only the next confirmation uses the new amount

### Requirement: Deactivating a template stops future due slots without affecting history
The system SHALL allow a user to deactivate (archive) a template. A deactivated template SHALL never appear as due again. Deactivation SHALL NOT delete or modify any `Transaction` previously generated from it, and there is no reactivation path.

#### Scenario: Deactivating a template with transaction history
- **WHEN** the user deactivates a template that has previously generated transactions
- **THEN** the template no longer appears in the due list, and its previously generated transactions remain unchanged in the Transactions list
