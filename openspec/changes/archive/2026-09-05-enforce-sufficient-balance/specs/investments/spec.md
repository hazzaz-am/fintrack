## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Investment Date Bound
The system SHALL reject an investment's `startDate`, a contribution's `transactionDate`, or a maturity/withdrawal's `transactionDate` if it is later than the current date.

#### Scenario: Future-dated contribution rejected
- **WHEN** a user attempts to record an investment contribution with a `transactionDate` one week in the future
- **THEN** the system rejects the request with a validation error and creates no transaction

#### Scenario: Future start date rejected
- **WHEN** a user attempts to create an investment with a `startDate` later than today
- **THEN** the system rejects the request with a validation error
