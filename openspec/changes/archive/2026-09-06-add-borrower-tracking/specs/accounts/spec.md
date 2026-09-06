## MODIFIED Requirements

### Requirement: Derived Account Balance
The system SHALL compute an account's balance at read time as `openingBalance + income − expenses + incoming transfers − outgoing transfers − investment contributions + investment returns − loan disbursements + loan repayments`, and SHALL NOT persist a mutable balance column that write paths update directly.

#### Scenario: Balance reflects income and expense
- **WHEN** a user has an account with opening balance ৳0, one income transaction of ৳80,000, and one expense transaction of ৳50,000
- **THEN** the computed balance for that account is ৳30,000

#### Scenario: Balance reflects transfers
- **WHEN** ৳5,000 is transferred from Account A to Account B
- **THEN** Account A's computed balance decreases by ৳5,000 and Account B's computed balance increases by ৳5,000, with no change to either account's income or expense totals

#### Scenario: Balance updates immediately after transaction edit
- **WHEN** a user edits the amount of a past expense transaction on an account
- **THEN** the account's computed balance reflects the edited amount on the very next read, with no separate reconciliation step required

#### Scenario: Balance reflects investment contribution
- **WHEN** a user contributes ৳200,000 from BRAC Bank to an investment
- **THEN** BRAC Bank's computed balance decreases by ৳200,000, with no change to BRAC Bank's income or expense totals

#### Scenario: Balance reflects investment return
- **WHEN** an investment matures and ৳216,000 (principal ৳200,000 + profit ৳16,000) is returned to BRAC Bank
- **THEN** BRAC Bank's computed balance increases by ৳216,000 total, of which only the ৳16,000 profit portion counts toward BRAC Bank's period income total

#### Scenario: Balance reflects a loan disbursement
- **WHEN** a user lends ৳5,000 from BRAC Bank to a borrower
- **THEN** BRAC Bank's computed balance decreases by ৳5,000, with no change to BRAC Bank's income or expense totals

#### Scenario: Balance reflects a loan repayment
- **WHEN** a borrower repays ৳2,000 credited to bKash
- **THEN** bKash's computed balance increases by ৳2,000, with no change to bKash's income or expense totals
