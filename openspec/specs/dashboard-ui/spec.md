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

### Requirement: Dashboard remains usable at phone widths
The Dashboard's metric card grids and chart cards SHALL reflow to fit narrow screens without horizontal scrolling, truncated values, or overlapping text.

#### Scenario: Dashboard viewed at 375px width
- **WHEN** the Dashboard is loaded at a 375px viewport width
- **THEN** metric cards (income, expenses, net cash flow, savings rate, investment totals) stack into a legible grid with no clipped currency values, and the balance trend chart and category breakdown chart resize to fit within the viewport without horizontal overflow

### Requirement: Dashboard shows a reserved-funds return banner
The Dashboard SHALL display, at the top of the page, one line per open or overdue `GoalReservationPromise` belonging to the user, each showing the promise's goal name, `remainingAmount`, and `dueDate`, sourced from the `goal-reservation-guard` capability. Each line SHALL provide a return action (recording a partial or full return against that promise) and a write-off action (closing the promise for its outstanding `remainingAmount`). A promise whose `dueDate` has passed SHALL be visually distinguished as overdue but SHALL remain on the banner until resolved or written off. The banner SHALL be omitted entirely when the user has no open or overdue promises.

#### Scenario: One promise outstanding
- **WHEN** a user has one open `GoalReservationPromise` for ৳200 owed back to "Marriage" by a future date
- **THEN** the dashboard's top banner shows that goal name, ৳200, and the due date, with return and write-off actions available

#### Scenario: Multiple promises shown independently
- **WHEN** a user has two open promises against the same goal with different due dates
- **THEN** the banner shows both as separate lines, each independently actionable

#### Scenario: Overdue promise is visually distinguished
- **WHEN** a promise's due date has passed and its `remainingAmount` is still greater than zero
- **THEN** the banner shows that line in an overdue visual style, and it remains present rather than disappearing

#### Scenario: No promises, no banner
- **WHEN** a user has no open or overdue `GoalReservationPromise` records
- **THEN** the dashboard renders with no reservation banner present

#### Scenario: Returning from the banner
- **WHEN** a user records a full return against a promise's banner line
- **THEN** the promise becomes resolved and its line is removed from the banner on next read

#### Scenario: Writing off from the banner
- **WHEN** a user chooses the write-off action on a banner line
- **THEN** the promise becomes written-off and its line is removed from the banner on next read
