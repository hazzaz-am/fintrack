## ADDED Requirements

### Requirement: Record Investment Contribution Transaction
The system SHALL support an `INVESTMENT_CONTRIBUTION` transaction type carrying an `accountId` and an `investmentId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`. The system SHALL NOT count `INVESTMENT_CONTRIBUTION` transactions as income or expense.

#### Scenario: Investment contribution recorded
- **WHEN** the system records an `INVESTMENT_CONTRIBUTION` of ৳200,000 against BRAC Bank and a given investment
- **THEN** the transaction is created with `accountId` and `investmentId` set, no category, and it does not contribute to the period's income or expense totals

### Requirement: Record Investment Return Transaction
The system SHALL support an `INVESTMENT_RETURN` transaction type carrying an `accountId` and an `investmentId`, no `categoryId`, and no `sourceAccountId`/`destinationAccountId`, representing only the principal portion of an investment payout. The system SHALL NOT count `INVESTMENT_RETURN` transactions as income or expense.

#### Scenario: Investment return recorded
- **WHEN** the system records an `INVESTMENT_RETURN` of ৳200,000 against BRAC Bank and a given investment
- **THEN** the transaction is created with `accountId` and `investmentId` set, no category, and it does not contribute to the period's income or expense totals

#### Scenario: Profit is a separate income transaction
- **WHEN** an investment payout includes profit above principal
- **THEN** the system records that profit as a separate ordinary `INCOME` transaction under the "Investment Return" category, distinct from the `INVESTMENT_RETURN` transaction
