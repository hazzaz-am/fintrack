## MODIFIED Requirements

### Requirement: User can create a recurring transaction template
The system SHALL allow a user to create a `RecurringTransaction` template with a name, amount, account, category, type (`INCOME` or `EXPENSE`), frequency (`WEEKLY`, `MONTHLY`, `QUARTERLY`, or `YEARLY`), start date, and optional end date. The account and category SHALL belong to the requesting user, and the category's type SHALL match the template's type. The create/edit form SHALL validate fields client-side before submission, using the same schema the Server Action validates with; the category/type match and account ownership rules remain server-checked since they depend on server-side data.

#### Scenario: Creating a monthly expense template
- **WHEN** the user creates a template named "Home" with type Expense, amount ৳50,000, monthly frequency, an account, and a category
- **THEN** the template is created with status Active

#### Scenario: Creating a template with a mismatched category type
- **WHEN** the user submits a template with type Income but selects a category whose type is Expense
- **THEN** the system rejects the request with a validation error and no template is created

#### Scenario: Creating a template referencing another user's account
- **WHEN** the user submits a template referencing an account they do not own
- **THEN** the system rejects the request with a not-found error

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the create/edit form (e.g. an empty name or non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can confirm a due template into a real transaction
The system SHALL allow the user to confirm a due template, creating a real `Transaction` of the template's type with the template's account, category, and amount pre-filled (all editable before saving), linked to the template via `recurringTransactionId`. The confirm form SHALL validate the editable fields client-side before submission, using the same schema used for recording a transaction of that type.

#### Scenario: Confirming a due expense template
- **WHEN** the user confirms a due "Home" expense template
- **THEN** an `EXPENSE` transaction is created with the template's account, category, and amount, linked to the template, and the template no longer appears as due until its next slot

#### Scenario: Confirming with an edited amount
- **WHEN** the user confirms a due template but changes the amount before saving
- **THEN** the created transaction reflects the edited amount, not the template's stored amount

#### Scenario: Confirming with an invalid edited amount
- **WHEN** the user edits the amount on the confirm form to an invalid value (e.g. non-numeric or negative) and attempts to save
- **THEN** a field-level error is shown and no transaction is created
