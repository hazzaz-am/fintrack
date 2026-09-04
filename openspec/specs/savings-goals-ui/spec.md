# savings-goals-ui Specification

## Purpose

TBD - added by savings-goals-ui change. The Savings Goals screen: listing, progress display, and the create/edit/archive/allocate/move actions backed by the `savings-goals` capability.

## Requirements

### Requirement: Savings Goals screen lists all goals grouped by status
The Savings Goals screen SHALL display every goal belonging to the authenticated user, sourced from `SavingsGoalService.list` plus `getProgress` for each, grouped into an Active section and a collapsed "Archived goals" section for goals with status `ARCHIVED`.

#### Scenario: User with active and archived goals
- **WHEN** an authenticated user with one Active and one Archived goal visits `/savings-goals`
- **THEN** the Active goal appears in the primary grid and the Archived goal appears in the collapsed "Archived goals" section, not the primary grid

#### Scenario: User with no goals
- **WHEN** an authenticated user with zero savings goals visits `/savings-goals`
- **THEN** the screen shows an empty state with an action to create the first goal, rather than an empty grid

### Requirement: Goal card shows progress, target date, and per-account allocation breakdown
Each goal card SHALL show the goal's name, derived allocated amount, target amount, computed progress percentage as a visual progress bar, target date (if set), and the per-account breakdown from `getProgress().byAccount`.

#### Scenario: Goal funded from multiple accounts
- **WHEN** a goal has ৳120,000 allocated from BRAC Bank and ৳60,000 allocated from City Bank, against a ৳300,000 target
- **THEN** the card shows 60% progress and lists both BRAC Bank (৳120,000) and City Bank (৳60,000) as contributing accounts

### Requirement: Achieved goals are visually distinguished
A goal whose derived allocated total is greater than or equal to its target amount SHALL display an "achieved" badge, computed at render time — this state is never read from a stored field.

#### Scenario: Goal reaches its target
- **WHEN** a goal's derived allocated total equals or exceeds its target amount
- **THEN** its card shows an achieved badge, in addition to (not instead of) its progress bar and allocation breakdown

### Requirement: Over-allocated contributing accounts are flagged on the goal card
If any account contributing to a goal is currently over-allocated (per `SavingsGoalService.getAccountAllocationStatus`), the goal card SHALL display an over-allocation warning identifying the affected account.

#### Scenario: Contributing account becomes over-allocated
- **WHEN** a goal is funded partly from an account that a retroactive transaction edit has pushed into an over-allocated state
- **THEN** the goal's card shows an over-allocation warning naming that account, without blocking any other action on the card

### Requirement: User can create a savings goal
The Savings Goals screen SHALL provide a creation dialog for name, target amount, optional target date, and optional description, backed by `SavingsGoalService.create`.

#### Scenario: Create a goal
- **WHEN** a user submits the creation dialog with a name and target amount
- **THEN** a new goal is created with zero allocated amount and appears in the Active section

### Requirement: User can edit a savings goal
The Savings Goals screen SHALL provide an edit action on any Active goal, backed by `SavingsGoalService.update`, allowing the name, target amount, target date, and description to be changed.

#### Scenario: Edit an active goal
- **WHEN** a user edits an Active goal's target amount
- **THEN** the goal's target amount is updated and its progress percentage recalculates accordingly

### Requirement: User can archive a savings goal
The Savings Goals screen SHALL provide an archive action on any Active goal, requiring an explicit confirmation step before submitting, backed by `SavingsGoalService.archive`.

#### Scenario: Archive with confirmation
- **WHEN** a user triggers the archive action on a goal and confirms it in the confirmation dialog
- **THEN** the goal's status becomes `ARCHIVED` and it moves from the Active section to the collapsed "Archived goals" section

#### Scenario: Archive action unavailable on already-archived goals
- **WHEN** a user views an Archived goal's card
- **THEN** no archive action is present

### Requirement: User can allocate account funds to a goal
The Savings Goals screen SHALL provide an allocate action on any Active goal, backed by `SavingsGoalService.allocate`, letting the user choose an account and amount.

#### Scenario: Allocate funds from the screen
- **WHEN** a user allocates ৳4,000 from BRAC Bank to a goal via the allocate dialog
- **THEN** the allocation is recorded and the goal's card reflects the increased allocated total without a full page reload

#### Scenario: Allocation exceeding unallocated balance is rejected
- **WHEN** a user attempts to allocate more than an account's unallocated balance via the allocate dialog
- **THEN** the dialog surfaces the server's rejection message and does not close

### Requirement: User can move an allocation from one goal to another
The Savings Goals screen SHALL provide a "move to another goal" action on any Active goal, backed by `SavingsGoalService.moveAllocation`, scoping the offered accounts to those the source goal currently has allocations from.

#### Scenario: Move allocation between goals
- **WHEN** a user moves ৳1,000 from "Marriage" to "Travel" for a shared contributing account via the move dialog
- **THEN** both goals' cards reflect the updated allocated totals, and the amount offered for moving is capped at what that account has allocated to the source goal

### Requirement: Savings Goals navigation link is enabled
The sidebar navigation entry for Savings Goals SHALL be enabled, linking to `/savings-goals`.

#### Scenario: Navigating to Savings Goals
- **WHEN** an authenticated user clicks "Savings Goals" in the sidebar
- **THEN** they are taken to `/savings-goals`, which renders without error

### Requirement: Savings goals screen remains usable at phone widths
The savings goal list and its create/contribute forms SHALL remain fully usable at phone widths without horizontal scrolling or clipped progress figures.

#### Scenario: Savings goals screen viewed at 375px width
- **WHEN** the Savings Goals screen is loaded at a 375px viewport width
- **THEN** each goal's name, progress, and target amount remain visible without clipping, and the create/contribute forms present as single-column
