# expenses-ui Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Expenses screen shows total expenses and category breakdown for a selected period
The Expenses screen SHALL display total expenses for a selected period (via the shared date-range resolver) and a breakdown by expense category, sourced from `TransactionService.getSummary` and `AnalyticsService.getCategoryBreakdown`.

#### Scenario: User with expenses in the period
- **WHEN** an authenticated user with recorded expenses visits `/expenses` for a period containing transactions
- **THEN** the total expenses for that period is shown alongside a chart breaking it down by category

#### Scenario: User with no expenses in the period
- **WHEN** an authenticated user visits `/expenses` for a period with no expense transactions
- **THEN** an empty/zero state is shown instead of an empty or broken chart

### Requirement: Expenses screen shows a trend over time
The Expenses screen SHALL display expenses over time using `AnalyticsService.getMonthlyTrend`.

#### Scenario: Multiple months of expenses
- **WHEN** the user has expenses recorded across multiple months
- **THEN** the trend chart shows one point per month

### Requirement: Expenses screen shows a monthly comparison
The Expenses screen SHALL show how the selected period's total expenses compares to the previous equivalent period.

#### Scenario: Spending increased month over month
- **WHEN** the user's selected month's total expenses are higher than the prior month's
- **THEN** the comparison indicates an increase, computed from the same aggregation used for the trend chart

### Requirement: Expenses screen shows recent expense transactions, read-only
The Expenses screen SHALL display the user's most recent expense transactions in a read-only list; editing or deleting a transaction is not available on this screen.

#### Scenario: Viewing a recent expense transaction
- **WHEN** the user views the recent expenses list on `/expenses`
- **THEN** each entry links to the Transactions screen for editing or deleting, and no inline edit/delete control is present on this screen

### Requirement: User can quickly record an expense from the Expenses screen
The Expenses screen SHALL provide a quick-add action to record a new expense transaction, using the same record-expense capability as the Transactions screen.

#### Scenario: Quick-add expense
- **WHEN** the user records an expense transaction via the Expenses screen's quick-add action
- **THEN** the transaction is created and the period's total expenses and breakdown update to include it
