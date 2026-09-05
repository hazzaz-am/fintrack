# investments Specification

## Purpose

Investment tracking: creation, contribution and maturity/withdrawal recording, derived principal computation, and maturity/totals reporting.

## Requirements

### Requirement: Create Investment
The system SHALL allow an authenticated user to create an investment with a name, type, optional institution, start date, optional maturity date, optional expected return amount/rate, optional notes, and an `openingPrincipal` (defaulting to zero) representing principal committed before ledger tracking began. The system SHALL NOT require or accept a funding account on the investment record itself.

#### Scenario: Create a fully-tracked investment
- **WHEN** a user creates an investment named "BRAC Bank FDR" with `openingPrincipal` of ৳0
- **THEN** the system creates the investment with `status = Planned` and zero derived principal until a contribution is recorded

#### Scenario: Create a pre-existing investment with no ledger history
- **WHEN** a user creates an investment named "Family Land" of type "Real Estate" with `openingPrincipal` of ৳500,000 and no funding account
- **THEN** the system creates the investment with a derived principal of ৳500,000, with no `Transaction` rows required

### Requirement: Record Investment Contribution
The system SHALL allow a user to fund an investment from one of their accounts by recording an `INVESTMENT_CONTRIBUTION` transaction, reducing that account's computed balance and increasing the investment's derived principal by the same amount. The system SHALL allow multiple contributions to the same investment from different accounts over time. The system SHALL reject the contribution if recording it would cause the funding account's chronologically-ordered running balance (replaying `openingBalance` forward through all of the account's transactions in `transactionDate`, then `createdAt`, then `id` order) to go negative at any point, whether the contribution is made on its own or as an investment's initial contribution at creation time.

#### Scenario: Single lump-sum contribution
- **WHEN** a user contributes ৳200,000 to "BRAC Bank FDR" from their BRAC Bank account
- **THEN** the system records one `INVESTMENT_CONTRIBUTION` transaction, BRAC Bank's computed balance decreases by ৳200,000, and the investment's derived principal increases by ৳200,000

#### Scenario: Recurring contributions from multiple accounts
- **WHEN** a user contributes ৳5,000 to a DPS investment from BRAC Bank in one month and ৳5,000 from City Bank the next month
- **THEN** the system records two `INVESTMENT_CONTRIBUTION` transactions against the same investment, each debiting its respective account, and the investment's derived principal reflects the sum of both contributions plus any `openingPrincipal`

#### Scenario: Contribution excluded from income/expense totals
- **WHEN** a user records an investment contribution
- **THEN** the transaction does not affect the period's total income or total expenses

#### Scenario: Contribution rejected for insufficient balance
- **WHEN** a user attempts to contribute ৳50,000 to an investment from BRAC Bank, but BRAC Bank's chronological running balance at that point would only be ৳5,000
- **THEN** the system rejects the request with an `INSUFFICIENT_BALANCE` error, and neither the transaction nor the investment's principal is affected

#### Scenario: Initial contribution at creation time also checked
- **WHEN** a user creates a new investment with an initial contribution of ৳50,000 from an account whose chronological running balance at that point would only be ৳5,000
- **THEN** the system rejects the creation with an `INSUFFICIENT_BALANCE` error, and creates neither the investment's initial contribution nor an inconsistent investment record

### Requirement: Investment Date Bound
The system SHALL reject an investment's `startDate`, a contribution's `transactionDate`, or a maturity/withdrawal's `transactionDate` if it is later than the current date.

#### Scenario: Future-dated contribution rejected
- **WHEN** a user attempts to record an investment contribution with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no transaction

#### Scenario: Future start date rejected
- **WHEN** a user attempts to create an investment with a `startDate` later than today
- **THEN** the system rejects the request with a validation error

### Requirement: Derived Investment Principal
The system SHALL compute an investment's current principal at read time as `openingPrincipal + SUM(INVESTMENT_CONTRIBUTION for this investment) − SUM(INVESTMENT_RETURN for this investment)`, and SHALL NOT persist a mutable principal column that write paths update directly.

#### Scenario: Principal reflects opening amount and contributions
- **WHEN** an investment has `openingPrincipal` of ৳0 and two contributions of ৳100,000 each
- **THEN** the computed principal for that investment is ৳200,000

#### Scenario: Principal updates immediately after a new contribution
- **WHEN** a user records an additional contribution to an existing investment
- **THEN** the investment's computed principal reflects the new total on the very next read

### Requirement: Record Investment Maturity or Withdrawal
The system SHALL allow a user to record a maturity or withdrawal for an active investment by specifying the principal amount returned and, optionally, a profit amount. The system SHALL record the principal portion as an `INVESTMENT_RETURN` transaction crediting a chosen account, and SHALL record any profit as a separate, ordinary `INCOME` transaction under the "Investment Return" category on that same account. The system SHALL transition the investment's status as part of the same operation.

#### Scenario: Full maturity with profit
- **WHEN** a user records the maturity of "BRAC Bank FDR" with principal ৳200,000 and profit ৳16,000 returned to BRAC Bank
- **THEN** the system records one `INVESTMENT_RETURN` transaction of ৳200,000 and one `INCOME` transaction of ৳16,000 under "Investment Return," BRAC Bank's computed balance increases by ৳216,000 total, the investment's derived principal decreases by ৳200,000, the period's total income increases by only ৳16,000, and the investment's status becomes `Matured`

#### Scenario: Partial early withdrawal
- **WHEN** a user withdraws ৳50,000 of principal early from an investment with ৳200,000 derived principal, with no profit
- **THEN** the system records one `INVESTMENT_RETURN` transaction of ৳50,000, the investment's derived principal decreases to ৳150,000, and the investment's status remains unchanged unless the user also specifies a status transition

#### Scenario: Status transitions only via explicit recording
- **WHEN** an investment's `maturityDate` passes without the user recording a maturity or withdrawal
- **THEN** the investment's status remains `Active` and no `INVESTMENT_RETURN` or `INCOME` transaction is created automatically

### Requirement: Upcoming and Overdue Maturity Reporting
The system SHALL report, for each `Active` investment with a `maturityDate`, a computed `daysUntilMaturity` value that MAY be negative, and SHALL distinguish investments whose maturity date has passed without a recorded payout from those still upcoming.

#### Scenario: Upcoming maturity
- **WHEN** a user requests upcoming maturities and an active investment matures in 45 days
- **THEN** the system returns that investment with `daysUntilMaturity = 45`

#### Scenario: Overdue maturity
- **WHEN** an active investment's `maturityDate` was 10 days ago and no maturity/withdrawal has been recorded
- **THEN** the system returns that investment with `daysUntilMaturity = -10`, distinguishable from upcoming (non-overdue) investments

#### Scenario: Matured investments excluded from upcoming list
- **WHEN** an investment's status is `Matured` or `Withdrawn`
- **THEN** the system excludes it from the upcoming/overdue maturity report

### Requirement: Investment Totals
The system SHALL compute total invested (sum of derived principal across active investments), current estimated value (sum of `currentValue` across active investments), and expected profit (current estimated value minus total invested) via database aggregation, not by loading all investments into the application and summing them there.

#### Scenario: Investment totals
- **WHEN** a user requests their investment totals
- **THEN** the system returns total invested, current estimated value, and expected profit computed via aggregate queries scoped to that user's active investments
