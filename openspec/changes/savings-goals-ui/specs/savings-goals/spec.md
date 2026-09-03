## ADDED Requirements

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
