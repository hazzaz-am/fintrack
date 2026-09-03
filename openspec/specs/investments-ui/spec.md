# investments-ui Specification

## Purpose

The Investments screen: a card-based list of investments grouped by status (Active/Planned vs. a collapsed Past section), creation across all three funding shapes, contribution recording, and maturity/withdrawal recording.

## Requirements

### Requirement: Investments screen lists all investments grouped by status
The Investments screen SHALL display every investment belonging to the authenticated user, sourced from `InvestmentService.listWithPrincipal`, grouped into an Active section (including Planned investments), and a collapsed "Past investments" section for Matured/Withdrawn/Cancelled investments.

#### Scenario: User with active and closed investments
- **WHEN** an authenticated user with one Active and one Matured investment visits `/investments`
- **THEN** the Active investment appears in the primary grid and the Matured investment appears in the collapsed "Past investments" section, not the primary grid

#### Scenario: User with no investments
- **WHEN** an authenticated user with zero investments visits `/investments`
- **THEN** the screen shows an empty state with an action to create the first investment, rather than an empty grid

### Requirement: Overdue active investments are visually distinguished
An Active investment whose `maturityDate` has passed without a recorded maturity/withdrawal SHALL be visually distinguished from an Active investment still approaching its maturity date, using the same overdue convention already established on the Dashboard (`daysUntilMaturity < 0`).

#### Scenario: Investment past maturity with no payout recorded
- **WHEN** an Active investment's `maturityDate` was 10 days ago and no maturity/withdrawal has been recorded
- **THEN** its card shows "Overdue by 10 days" in the overdue visual treatment, not a neutral "matures in -10 days" or no indication at all

### Requirement: User can create an investment via one dialog covering all funding shapes
The Investments screen SHALL provide a single creation dialog offering three funding modes — fund from an account now, record an opening principal for a pre-existing asset, or save without funding as Planned — submitting through one action backed by `InvestmentService.createWithInitialContribution`.

#### Scenario: Fund it now
- **WHEN** a user creates an investment in "fund it now" mode with an account and a contribution amount
- **THEN** the investment is created and a matching `INVESTMENT_CONTRIBUTION` transaction exists against the chosen account, and the investment's status is Active

#### Scenario: Already-owned asset
- **WHEN** a user creates an investment in "I already own this" mode with an opening principal and no account
- **THEN** the investment is created with that opening principal and no ledger transaction, and its status is Active

#### Scenario: Save without funding
- **WHEN** a user creates an investment with funding skipped
- **THEN** the investment is created with zero principal and status Planned

### Requirement: User can add a contribution to an existing investment
The Investments screen SHALL provide a contribute action on any Planned or Active investment, backed by `InvestmentService.contribute`, and SHALL NOT offer this action on a Matured, Withdrawn, or Cancelled investment.

#### Scenario: Contribute to a Planned investment
- **WHEN** a user records a contribution on a Planned investment
- **THEN** the contribution is recorded, the investment's derived principal increases by that amount, and its status becomes Active

#### Scenario: Contribute action unavailable on closed investments
- **WHEN** a user views a Matured, Withdrawn, or Cancelled investment's card
- **THEN** no contribute action is present

### Requirement: User can record a maturity or withdrawal with the outcome limited to Matured or Withdrawn
The Investments screen SHALL provide a record-maturity-or-withdrawal action on Active investments, pre-filling the principal amount with the investment's currently known derived principal, accepting an optional profit amount, and offering only Matured or Withdrawn as the resulting status — no option is presented that implies the investment could remain Active after this action.

#### Scenario: Default principal matches available amount
- **WHEN** a user opens the record-maturity dialog for an Active investment with ৳200,000 derived principal
- **THEN** the principal field is pre-filled with ৳200,000

#### Scenario: Client-side guard against exceeding available principal
- **WHEN** a user edits the principal field to an amount greater than the investment's known derived principal and attempts to submit
- **THEN** the dialog prevents submission and shows an error, without a round trip to the server

#### Scenario: Profit recorded separately from principal
- **WHEN** a user records a maturity with both a principal amount and a profit amount
- **THEN** the resulting transactions and the investment's status update exactly as `InvestmentService.recordMaturityOrWithdrawal` already specifies (see `specs/investments/spec.md`'s "Full maturity with profit" scenario) — this screen adds no new server-side behavior

### Requirement: Investments navigation link is enabled
The sidebar navigation entry for Investments SHALL be enabled, linking to `/investments`.

#### Scenario: Navigating to Investments
- **WHEN** an authenticated user clicks "Investments" in the sidebar
- **THEN** they are taken to `/investments`, which renders without error
