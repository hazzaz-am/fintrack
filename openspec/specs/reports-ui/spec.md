# reports-ui Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Reports screen shows a Monthly Financial Summary
The Reports screen SHALL display, for a selected period, total income, total expenses, net savings, savings rate, and the top expense category, sourced from `TransactionService.getSummary` and `AnalyticsService.getCategoryBreakdown` — the top expense category is derived from the breakdown result, not a separate query.

#### Scenario: Period with income and expenses
- **WHEN** the user views the Monthly Financial Summary for a period with both income and expense transactions
- **THEN** it shows total income, total expenses, net savings, savings rate, and the single expense category with the highest total for that period

#### Scenario: Period with no expenses
- **WHEN** the user views the Monthly Financial Summary for a period with no expense transactions
- **THEN** no top expense category is shown, rather than an error or a misleading zero-amount category

### Requirement: Reports screen shows an Account Balance Report
The Reports screen SHALL display each active account with its current derived balance, sourced from `AccountService.listWithBalances`.

#### Scenario: Viewing account balances
- **WHEN** the user views the Account Balance Report section
- **THEN** every active account is listed with its current derived balance

### Requirement: Reports screen shows an Investment Report
The Reports screen SHALL display total invested, active investment count, matured investment count, expected returns, and upcoming maturities, sourced from `InvestmentService`.

#### Scenario: Viewing the investment report
- **WHEN** the user views the Investment Report section
- **THEN** it shows total invested and expected returns across active investments, and lists upcoming maturities

### Requirement: Reports screen supports selecting the summary period
The Reports screen SHALL let the user select the period the Monthly Financial Summary covers, using the shared date-range resolver.

#### Scenario: Changing the period
- **WHEN** the user selects a different month for the Monthly Financial Summary
- **THEN** the summary's figures recompute for the newly selected period

### Requirement: Reports screen remains usable at phone widths
The Reports screen's tabs, metric card grids, and account/investment lists SHALL remain fully usable at phone widths without horizontal scrolling or clipped values.

#### Scenario: Reports screen viewed at 375px width
- **WHEN** the Reports screen is loaded at a 375px viewport width
- **THEN** the summary/accounts/investments tabs remain reachable and legible, and each tab's metric card grid reflows to fit the viewport without horizontal overflow
