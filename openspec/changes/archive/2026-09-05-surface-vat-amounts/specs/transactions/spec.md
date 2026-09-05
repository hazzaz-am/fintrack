## MODIFIED Requirements

### Requirement: Monthly Aggregation
The system SHALL compute total income, total expenses, and net cash flow for a given period using database aggregation over transactions, not by loading all transactions into the application and summing them there. The total expenses figure SHALL include any `vatAmount` recorded against `EXPENSE` transactions in the period, so it reflects the full amount deducted from the paying account.

#### Scenario: Monthly summary
- **WHEN** a user requests their September 2026 summary
- **THEN** the system returns total income, total expenses, and net cash flow computed via a database aggregate query scoped to that date range and that user

#### Scenario: Expense total includes VAT
- **WHEN** a user's September 2026 expenses include a ৳100 transaction with ৳15 of VAT
- **THEN** the period's total expenses figure includes both the ৳100 and the ৳15, and net cash flow (income − expenses) reflects the same ৳115

#### Scenario: Expense without VAT is unaffected
- **WHEN** a user's expense transaction has no `vatAmount` recorded
- **THEN** it contributes only its `amount` to the period's total expenses, exactly as before this change
