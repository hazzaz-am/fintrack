# dashboard-ui Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Dashboard shows a top-line financial summary for the current month
The Dashboard SHALL display total available balance, income this month, expenses this month, net cash flow, savings rate, total invested, and expected investment return, sourced from `AccountService.listWithBalances`, `TransactionService.getSummary`, and `InvestmentService.getTotals`.

#### Scenario: Authenticated user visits the dashboard
- **WHEN** an authenticated user visits `/dashboard`
- **THEN** the top-line metrics reflect the current calendar month's data, computed from the underlying services rather than stored/cached values

#### Scenario: Savings rate is derived, not stored
- **WHEN** the dashboard renders the savings rate
- **THEN** it is computed as `(income - expenses) / income * 100` from the same income/expense totals shown elsewhere on the page, and shown as zero (not an error) when income for the period is zero

### Requirement: Dashboard shows an account balance summary
The Dashboard SHALL list each active account with its current derived balance, sourced from `AccountService.listWithBalances`.

#### Scenario: Multiple accounts
- **WHEN** the user has multiple active accounts
- **THEN** each is listed with its current balance, and the sum matches the dashboard's total available balance

### Requirement: Dashboard shows an expense breakdown chart
The Dashboard SHALL display the current month's expenses broken down by category, sourced from `AnalyticsService.getCategoryBreakdown`.

#### Scenario: Expenses recorded this month
- **WHEN** the user has expense transactions in the current month
- **THEN** the breakdown chart reflects those transactions grouped by category

### Requirement: Dashboard shows upcoming investment maturities
The Dashboard SHALL display upcoming investment maturities, sourced from `InvestmentService.getUpcomingMaturities`.

#### Scenario: An investment is approaching maturity
- **WHEN** the user has an active investment with a future maturity date
- **THEN** it appears in the upcoming maturities list with its expected payout

### Requirement: Dashboard shows recent transactions, read-only
The Dashboard SHALL display the user's most recent transactions in a read-only list; editing or deleting a transaction is not available on this screen.

#### Scenario: Viewing a recent transaction
- **WHEN** the user views the recent transactions list on `/dashboard`
- **THEN** each entry links to the Transactions screen for editing or deleting, and no inline edit/delete control is present on the dashboard

### Requirement: User can quickly record a transaction from the Dashboard
The Dashboard SHALL provide a quick-add action to record a new income, expense, or transfer transaction, using the same capability as the Transactions screen.

#### Scenario: Quick-add from dashboard
- **WHEN** the user records a transaction via the Dashboard's quick-add action
- **THEN** the transaction is created and the dashboard's top-line metrics reflect it on next read
