## ADDED Requirements

### Requirement: Dashboard shows a Due Recurring widget
The Dashboard SHALL display currently-due recurring transaction templates, sourced from `RecurringTransactionService.getDueTemplates`, each with a one-click action to confirm it into a real transaction.

#### Scenario: A template is due
- **WHEN** the user has a recurring template currently due
- **THEN** it appears in the Due Recurring widget with its name and amount, and a confirm action

#### Scenario: Confirming from the widget
- **WHEN** the user confirms a due template from the Dashboard widget
- **THEN** the corresponding transaction is created and the template is removed from the widget until its next slot is due

#### Scenario: No templates due
- **WHEN** the user has no currently-due recurring templates
- **THEN** the widget shows an empty state rather than being omitted or erroring
