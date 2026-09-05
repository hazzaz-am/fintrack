## MODIFIED Requirements

### Requirement: User can create an investment via one dialog covering all funding shapes
The Investments screen SHALL provide a single creation dialog offering three funding modes — fund from an account now, record an opening principal for a pre-existing asset, or save without funding as Planned — submitting through one action backed by `InvestmentService.createWithInitialContribution`. The dialog SHALL validate fields client-side before submission, using the same schema as the Server Action.

#### Scenario: Fund it now
- **WHEN** a user creates an investment in "fund it now" mode with an account and a contribution amount
- **THEN** the investment is created and a matching `INVESTMENT_CONTRIBUTION` transaction exists against the chosen account, and the investment's status is Active

#### Scenario: Already-owned asset
- **WHEN** a user creates an investment in "I already own this" mode with an opening principal and no account
- **THEN** the investment is created with that opening principal and no ledger transaction, and its status is Active

#### Scenario: Save without funding
- **WHEN** a user creates an investment with funding skipped
- **THEN** the investment is created with zero principal and status Planned

#### Scenario: Field-level errors appear before submit
- **WHEN** a user blurs an invalid field in any funding mode (e.g. a negative contribution amount)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can add a contribution to an existing investment
The Investments screen SHALL provide a contribute action on any Planned or Active investment, backed by `InvestmentService.contribute`, and SHALL NOT offer this action on a Matured, Withdrawn, or Cancelled investment. The contribute form SHALL validate fields client-side before submission, using the same schema as the Server Action.

#### Scenario: Contribute to a Planned investment
- **WHEN** a user records a contribution on a Planned investment
- **THEN** the contribution is recorded, the investment's derived principal increases by that amount, and its status becomes Active

#### Scenario: Contribute action unavailable on closed investments
- **WHEN** a user views a Matured, Withdrawn, or Cancelled investment's card
- **THEN** no contribute action is present

#### Scenario: Field-level error appears before submit
- **WHEN** a user blurs the contribution amount field with an invalid value (e.g. zero or non-numeric)
- **THEN** the field's error is shown immediately, without submitting the form

### Requirement: User can record a maturity or withdrawal with the outcome limited to Matured or Withdrawn
The Investments screen SHALL provide a record-maturity-or-withdrawal action on Active investments, pre-filling the principal amount with the investment's currently known derived principal, accepting an optional profit amount, and offering only Matured or Withdrawn as the resulting status — no option is presented that implies the investment could remain Active after this action. The dialog's fields, including the principal-exceeds-available guard, SHALL validate client-side via the same shared schema-based validation used by every other migrated form, rather than bespoke component logic.

#### Scenario: Default principal matches available amount
- **WHEN** a user opens the record-maturity dialog for an Active investment with ৳200,000 derived principal
- **THEN** the principal field is pre-filled with ৳200,000

#### Scenario: Client-side guard against exceeding available principal
- **WHEN** a user edits the principal field to an amount greater than the investment's known derived principal and attempts to submit
- **THEN** the dialog prevents submission and shows an error, without a round trip to the server

#### Scenario: Profit recorded separately from principal
- **WHEN** a user records a maturity with both a principal amount and a profit amount
- **THEN** the resulting transactions and the investment's status update exactly as `InvestmentService.recordMaturityOrWithdrawal` already specifies (see `specs/investments/spec.md`'s "Full maturity with profit" scenario) — this screen adds no new server-side behavior
