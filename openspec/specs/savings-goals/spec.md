# savings-goals Specification

## Purpose

Savings goal CRUD and ledger-based allocation of account funds to goals, including the allocation-vs-balance invariant.

## Requirements

### Requirement: Create Savings Goal
The system SHALL allow a user to create a savings goal with a name, target amount, optional target date, and description.

#### Scenario: Create goal
- **WHEN** a user creates a goal named "Marriage Fund" with target amount ৳500,000
- **THEN** the system creates the goal owned by that user with zero allocated amount

### Requirement: Allocate Account Funds to a Goal
The system SHALL record allocation of account funds to a savings goal as an append-only ledger of `GoalAllocationEvent` entries (never a single mutable "current allocated" field), and SHALL derive a goal's current allocated amount as the sum of its allocation events.

#### Scenario: Allocate funds
- **WHEN** a user allocates ৳4,000 from BRAC Bank to their "Travel" goal
- **THEN** the system creates a `GoalAllocationEvent` of +৳4,000 for that goal/account pair, and the goal's derived allocated total increases by ৳4,000, while BRAC Bank's account balance is unchanged

#### Scenario: Allocation does not change account balance
- **WHEN** a user allocates any amount from an account to a goal
- **THEN** the account's computed balance (per the `accounts` capability) remains exactly the same before and after the allocation

### Requirement: Allocation Cannot Exceed Unallocated Balance
The system SHALL reject a new positive allocation if it would exceed the account's current unallocated balance (computed balance minus the sum of existing allocation events for that account), checked at the moment of allocation creation.

#### Scenario: Allocation within limit
- **WHEN** an account has a computed balance of ৳10,000 with ৳8,000 already allocated across goals, and a user allocates ৳2,000 more
- **THEN** the system accepts the allocation

#### Scenario: Allocation exceeds limit rejected
- **WHEN** an account has a computed balance of ৳10,000 with ৳8,000 already allocated across goals, and a user attempts to allocate ৳5,000 more
- **THEN** the system rejects the request, since only ৳2,000 remains unallocated

### Requirement: Move Allocation Between Goals
The system SHALL support moving an allocated amount from one goal to another as two `GoalAllocationEvent` entries (a negative event on the source goal, a positive event on the destination goal) written together, never as an in-place overwrite of a single allocation value.

#### Scenario: Move allocation
- **WHEN** a user moves ৳1,000 from "Marriage Fund" to "Travel Fund" for the same account
- **THEN** the system creates two allocation events — Marriage Fund −৳1,000, Travel Fund +৳1,000 — and both goals' derived allocated totals reflect the change, with full history of both events preserved

### Requirement: View Goal Progress
The system SHALL show, for each goal, the derived allocated amount, target amount, computed progress percentage, and which accounts contribute to it.

#### Scenario: Goal progress
- **WHEN** a user views a goal with target ৳500,000 and derived allocated total ৳180,000
- **THEN** the system displays 36% progress and lists each contributing account with its per-account allocated amount

### Requirement: Over-Allocation Warning
The system SHALL NOT block editing or deleting a transaction that retroactively causes an account's allocated total to exceed its computed balance; instead it SHALL surface a non-blocking over-allocated warning on the affected account and goals.

#### Scenario: Retroactive over-allocation surfaced, not blocked
- **WHEN** a user has ৳8,000 allocated on an account with ৳10,000 balance, then edits a past expense transaction on that account such that its computed balance drops to ৳5,000
- **THEN** the system saves the transaction edit without error, and subsequent reads of that account/its goals report an over-allocated state reflecting that ৳3,000 more is allocated than available

### Requirement: Update Savings Goal
The system SHALL allow a user to update a savings goal's name, target amount, target date, and description. Updating a goal SHALL NOT validate the new target amount against the goal's currently allocated total — a target may be set below, equal to, or above the amount already allocated.

#### Scenario: Update goal target
- **WHEN** a user updates their "Travel" goal's target amount from ৳100,000 to ৳50,000, and ৳45,000 is already allocated to it
- **THEN** the system saves the new target amount without error, and the goal's derived progress percentage recalculates against the new target

#### Scenario: Update rejects unowned goal
- **WHEN** a user attempts to update a savings goal that does not belong to them
- **THEN** the system rejects the request with a not-found error

### Requirement: Archive Savings Goal
The system SHALL allow a user to archive a savings goal, setting its status to `ARCHIVED`, unconditionally and regardless of its currently allocated total. Archiving SHALL NOT modify, remove, or reverse any `GoalAllocationEvent` belonging to the goal.

#### Scenario: Archive a fully-allocated goal
- **WHEN** a user archives a "Marriage" goal that has ৳180,000 allocated to it
- **THEN** the goal's status becomes `ARCHIVED`, and all of its existing `GoalAllocationEvent` rows remain unchanged and still sum to ৳180,000 when queried

#### Scenario: Archive rejects unowned goal
- **WHEN** a user attempts to archive a savings goal that does not belong to them
- **THEN** the system rejects the request with a not-found error

### Requirement: Achieved State Is Derived, Not Stored
The system SHALL NOT store an "achieved" status value for a savings goal. Whether a goal is achieved SHALL be computed at read time by comparing its derived allocated total (per the existing `getProgress` behavior) against its target amount, and SHALL update automatically as allocations change without any separate write.

#### Scenario: Goal crosses its target via allocation
- **WHEN** a user allocates funds to a goal such that its derived allocated total becomes greater than or equal to its target amount
- **THEN** the goal's stored `status` remains unchanged (`ACTIVE`), and any read of the goal's progress reports it as achieved based on the comparison, not a stored flag

#### Scenario: Goal drops back below target after a move-out
- **WHEN** a previously-achieved goal has an allocation moved out to another goal such that its derived allocated total falls below its target amount
- **THEN** the next read of the goal's progress reports it as no longer achieved, with no corrective write required
