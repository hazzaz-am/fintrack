# analytics Specification

## Purpose

TBD - created by archiving change transactions-and-analytics-ui. Update Purpose after archive.

## Requirements

### Requirement: Category breakdown is computed via database aggregation
The system SHALL compute, for a given user, transaction type (`INCOME` or `EXPENSE`), and date range, the total amount grouped by category using database aggregation, not by loading all matching transactions into the application and summing them there. For `EXPENSE`, the grouped total SHALL include any `vatAmount` recorded on each transaction, added to the category that transaction already belongs to.

#### Scenario: Expense breakdown for a month
- **WHEN** the system computes the expense category breakdown for a user's September 2026 transactions
- **THEN** it returns one total per expense category that has at least one transaction in that range, each computed via a database aggregate query

#### Scenario: No transactions in range
- **WHEN** the system computes a category breakdown for a range containing no matching transactions
- **THEN** it returns an empty result, not an error

#### Scenario: Transfers and investment movements are excluded
- **WHEN** the system computes a category breakdown for `INCOME` or `EXPENSE`
- **THEN** `TRANSFER`, `INVESTMENT_CONTRIBUTION`, and `INVESTMENT_RETURN` transactions are never included, regardless of range

#### Scenario: Category total includes VAT from its transactions
- **WHEN** a user has a ৳3,000 Electronics expense with ৳450 of VAT, and no other Electronics expenses in range
- **THEN** the Electronics category's total in the breakdown is ৳3,450

### Requirement: Monthly trend is computed via database aggregation
The system SHALL compute, for a given user and date range, total income and total expense bucketed by month using database aggregation, not by loading all matching transactions into the application and summing them there. The monthly expense total SHALL include any `vatAmount` recorded on `EXPENSE` transactions in that month.

#### Scenario: Six-month trend
- **WHEN** the system computes the monthly trend for a user's last six months
- **THEN** it returns one income total and one expense total per month in that range, including months with zero matching transactions as a zero total rather than omitting them

#### Scenario: Monthly expense total includes VAT
- **WHEN** a given month's expense transactions include ৳465 of combined VAT across several transactions
- **THEN** that month's expense total in the trend includes the ৳465 in addition to the transactions' `amount` values

### Requirement: Aggregations are scoped to the requesting user
The system SHALL scope every category breakdown and monthly trend query to the requesting user's own transactions only.

#### Scenario: Aggregation excludes other users' data
- **WHEN** a category breakdown or monthly trend is computed for a given user
- **THEN** no other user's transactions contribute to the result
