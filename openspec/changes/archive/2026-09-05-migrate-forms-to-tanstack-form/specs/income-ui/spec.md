## MODIFIED Requirements

### Requirement: User can quickly record income from the Income screen
The Income screen SHALL provide a quick-add action to record a new income transaction, using the same record-income capability as the Transactions screen. The quick-add form SHALL validate fields client-side before submission, using the same schema as the Transactions screen's income form.

#### Scenario: Quick-add income
- **WHEN** the user records an income transaction via the Income screen's quick-add action
- **THEN** the transaction is created and the period's total income and breakdown update to include it

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs an invalid field on the quick-add income form (e.g. a non-numeric amount)
- **THEN** that field's error is shown immediately, without submitting the form
