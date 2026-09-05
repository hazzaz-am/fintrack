## MODIFIED Requirements

### Requirement: Expenses screen shows total expenses and category breakdown for a selected period
The Expenses screen SHALL display total expenses for a selected period (via the shared date-range resolver) and a breakdown by expense category, sourced from `TransactionService.getSummary` and `AnalyticsService.getCategoryBreakdown`. The total expenses figure SHALL be VAT-inclusive; when the period includes any VAT-bearing expenses, the total SHALL be shown with a caption indicating how much of it is VAT.

#### Scenario: User with expenses in the period
- **WHEN** an authenticated user with recorded expenses visits `/expenses` for a period containing transactions
- **THEN** the total expenses for that period is shown alongside a chart breaking it down by category

#### Scenario: User with no expenses in the period
- **WHEN** an authenticated user visits `/expenses` for a period with no expense transactions
- **THEN** an empty/zero state is shown instead of an empty or broken chart

#### Scenario: Total includes a VAT caption when VAT is present
- **WHEN** the selected period's expenses total ৳5,565, of which ৳465 is VAT
- **THEN** the Total expenses card shows ৳5,565 with a muted caption reading the ৳465 VAT portion

#### Scenario: No caption when the period has no VAT
- **WHEN** the selected period's expenses include no VAT-bearing transactions
- **THEN** the Total expenses card shows the total with no VAT caption, exactly as before this change
