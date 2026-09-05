## MODIFIED Requirements

### Requirement: User can quickly record an expense from the Expenses screen
The Expenses screen SHALL provide a quick-add action to record a new expense transaction, using the same record-expense capability as the Transactions screen. The quick-add form SHALL validate fields client-side before submission, using the same schema as the Transactions screen's expense form.

#### Scenario: Quick-add expense
- **WHEN** the user records an expense transaction via the Expenses screen's quick-add action
- **THEN** the transaction is created and the period's total expenses and breakdown update to include it

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the quick-add expense form (e.g. a non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form
