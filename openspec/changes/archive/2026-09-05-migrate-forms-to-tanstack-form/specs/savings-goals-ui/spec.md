## MODIFIED Requirements

### Requirement: User can create a savings goal
The Savings Goals screen SHALL provide a creation dialog for name, target amount, optional target date, and optional description, backed by `SavingsGoalService.create`. The dialog SHALL validate fields client-side before submission, using the same schema as the Server Action.

#### Scenario: Create a goal
- **WHEN** a user submits the creation dialog with a name and target amount
- **THEN** a new goal is created with zero allocated amount and appears in the Active section

#### Scenario: Field-level errors appear before submit
- **WHEN** a user blurs an invalid field on the creation dialog (e.g. an empty name or non-numeric target amount)
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can edit a savings goal
The Savings Goals screen SHALL provide an edit action on any Active goal, backed by `SavingsGoalService.update`, allowing the name, target amount, target date, and description to be changed. The edit form SHALL validate fields client-side before submission, using the same schema as creation.

#### Scenario: Edit an active goal
- **WHEN** a user edits an Active goal's target amount
- **THEN** the goal's target amount is updated and its progress percentage recalculates accordingly

#### Scenario: Invalid edit
- **WHEN** a user edits an Active goal's field to a value that fails validation and submits
- **THEN** a field-level error is shown and the goal is not updated

### Requirement: User can allocate account funds to a goal
The Savings Goals screen SHALL provide an allocate action on any Active goal, backed by `SavingsGoalService.allocate`, letting the user choose an account and amount. The allocate form SHALL validate fields client-side (e.g. amount present and positive) before submission; whether the amount actually fits the account's current unallocated balance remains a server-side check.

#### Scenario: Allocate funds from the screen
- **WHEN** a user allocates ৳4,000 from BRAC Bank to a goal via the allocate dialog
- **THEN** the allocation is recorded and the goal's card reflects the increased allocated total without a full page reload

#### Scenario: Allocation exceeding unallocated balance is rejected
- **WHEN** a user attempts to allocate more than an account's unallocated balance via the allocate dialog
- **THEN** the dialog surfaces the server's rejection message and does not close

#### Scenario: Empty or non-numeric amount caught before submit
- **WHEN** a user blurs the amount field while it is empty or non-numeric
- **THEN** a field-level error is shown immediately, without a round trip to the server

### Requirement: User can move an allocation from one goal to another
The Savings Goals screen SHALL provide a "move to another goal" action on any Active goal, backed by `SavingsGoalService.moveAllocation`, scoping the offered accounts to those the source goal currently has allocations from. The move-allocation form SHALL validate fields client-side (e.g. amount present and positive) before submission; whether the amount fits what the account has allocated to the source goal remains a server-side check.

#### Scenario: Move allocation between goals
- **WHEN** a user moves ৳1,000 from "Marriage" to "Travel" for a shared contributing account via the move dialog
- **THEN** both goals' cards reflect the updated allocated totals, and the amount offered for moving is capped at what that account has allocated to the source goal

#### Scenario: Empty or non-numeric amount caught before submit
- **WHEN** a user blurs the amount field on the move dialog while it is empty or non-numeric
- **THEN** a field-level error is shown immediately, without a round trip to the server
