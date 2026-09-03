# analytics Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Category breakdown is computed via database aggregation
The system SHALL compute, for a given user, transaction type (`INCOME` or `EXPENSE`), and date range, the total amount grouped by category using database aggregation, not by loading all matching transactions into the application and summing them there.

#### Scenario: Expense breakdown for a month
- **WHEN** the system computes the expense category breakdown for a user's September 2026 transactions
- **THEN** it returns one total per expense category that has at least one transaction in that range, each computed via a database aggregate query

#### Scenario: No transactions in range
- **WHEN** the system computes a category breakdown for a range containing no matching transactions
- **THEN** it returns an empty result, not an error

#### Scenario: Transfers and investment movements are excluded
- **WHEN** the system computes a category breakdown for `INCOME` or `EXPENSE`
- **THEN** `TRANSFER`, `INVESTMENT_CONTRIBUTION`, and `INVESTMENT_RETURN` transactions are never included, regardless of range

### Requirement: Monthly trend is computed via database aggregation
The system SHALL compute, for a given user and date range, total income and total expense bucketed by month using database aggregation, not by loading all matching transactions into the application and summing them there.

#### Scenario: Six-month trend
- **WHEN** the system computes the monthly trend for a user's last six months
- **THEN** it returns one income total and one expense total per month in that range, including months with zero matching transactions as a zero total rather than omitting them

### Requirement: Aggregations are scoped to the requesting user
The system SHALL scope every category breakdown and monthly trend query to the requesting user's own transactions only.

#### Scenario: Aggregation excludes other users' data
- **WHEN** a category breakdown or monthly trend is computed for a given user
- **THEN** no other user's transactions contribute to the result
