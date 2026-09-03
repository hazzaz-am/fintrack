## ADDED Requirements

### Requirement: Income screen shows total income and breakdown by source for a selected period
The Income screen SHALL display total income for a selected period (via the shared date-range resolver) and a breakdown by income category/source, sourced from `TransactionService.getSummary` and `AnalyticsService.getCategoryBreakdown`.

#### Scenario: User with income in the period
- **WHEN** an authenticated user with recorded income visits `/income` for a period containing transactions
- **THEN** the total income for that period is shown alongside a chart breaking it down by source

#### Scenario: User with no income in the period
- **WHEN** an authenticated user visits `/income` for a period with no income transactions
- **THEN** an empty/zero state is shown instead of an empty or broken chart

### Requirement: Income screen shows a trend over time
The Income screen SHALL display income over time using `AnalyticsService.getMonthlyTrend`.

#### Scenario: Multiple months of income
- **WHEN** the user has income recorded across multiple months
- **THEN** the trend chart shows one point per month

### Requirement: Income screen shows recent income transactions, read-only
The Income screen SHALL display the user's most recent income transactions in a read-only list; editing or deleting a transaction is not available on this screen.

#### Scenario: Viewing a recent income transaction
- **WHEN** the user views the recent income list on `/income`
- **THEN** each entry links to the Transactions screen for editing or deleting, and no inline edit/delete control is present on this screen

### Requirement: User can quickly record income from the Income screen
The Income screen SHALL provide a quick-add action to record a new income transaction, using the same record-income capability as the Transactions screen.

#### Scenario: Quick-add income
- **WHEN** the user records an income transaction via the Income screen's quick-add action
- **THEN** the transaction is created and the period's total income and breakdown update to include it
