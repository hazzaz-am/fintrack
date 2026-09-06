## ADDED Requirements

### Requirement: Borrowers screen lists all borrowers with aggregate outstanding
The Borrowers screen SHALL display every borrower belonging to the authenticated user, sourced from `BorrowerService.listWithOutstanding`, each with its aggregate outstanding amount across all its loans.

#### Scenario: User with borrowers
- **WHEN** an authenticated user with two borrowers visits `/borrowers`
- **THEN** both appear with their current aggregate outstanding amounts

#### Scenario: User with no borrowers
- **WHEN** an authenticated user with zero borrowers visits `/borrowers`
- **THEN** the screen shows an empty state with an action to add the first borrower, rather than an empty list

### Requirement: Overdue loans are visually distinguished
A loan reported as overdue by the `borrowers` capability SHALL be visually distinguished from a loan still approaching its due date, using the same overdue convention already established for investments on this screen family.

#### Scenario: Loan past due date with balance remaining
- **WHEN** a loan's `dueDate` was 10 days ago and its outstanding amount is still greater than zero
- **THEN** its entry shows "Overdue by 10 days" in the overdue visual treatment, not a neutral or absent indication

#### Scenario: Overdue treatment clears immediately
- **WHEN** an overdue loan is fully repaid or written off
- **THEN** its entry no longer shows the overdue visual treatment on the next read

### Requirement: User can add a borrower
The Borrowers screen SHALL provide an action to create a new borrower with a name and optional notes, backed by `BorrowerService.create`, validating fields client-side before submission using the same schema as the Server Action.

#### Scenario: Add a borrower
- **WHEN** a user submits a valid name for a new borrower
- **THEN** the borrower is created and appears in the borrower list with zero outstanding

### Requirement: User can lend money to a borrower
The Borrowers screen SHALL provide a lend action on any borrower, backed by `BorrowerService.disburseLoan`, requiring a source account, amount, and due date, and SHALL surface the unallocated-balance cap as a client-side guard before submission in addition to the authoritative server-side check.

#### Scenario: Lend within the unallocated limit
- **WHEN** a user lends an amount at or below the source account's currently known unallocated balance
- **THEN** the loan is created and appears under that borrower with status Open

#### Scenario: Client-side guard against exceeding unallocated balance
- **WHEN** a user enters an amount greater than the source account's known unallocated balance and attempts to submit
- **THEN** the dialog prevents submission and shows an error, without a round trip to the server

#### Scenario: Field-level error appears before submit
- **WHEN** a user blurs the amount field with an invalid value (e.g. zero or negative)
- **THEN** the field's error is shown immediately, without submitting the form

### Requirement: User can record a repayment against a loan
The Borrowers screen SHALL provide a repay action on any Open or Partially Repaid loan, backed by `BorrowerService.recordRepayment`, requiring a destination account and amount, pre-filling the amount with the loan's currently known outstanding amount, and SHALL NOT offer this action on a Repaid or Written Off loan.

#### Scenario: Default amount matches outstanding
- **WHEN** a user opens the repay dialog for a loan with ৳3,000 outstanding
- **THEN** the amount field is pre-filled with ৳3,000

#### Scenario: Repay action unavailable on closed loans
- **WHEN** a user views a Repaid or Written Off loan
- **THEN** no repay action is present

#### Scenario: Client-side guard against exceeding outstanding
- **WHEN** a user edits the repayment amount to exceed the loan's known outstanding amount and attempts to submit
- **THEN** the dialog prevents submission and shows an error, without a round trip to the server

### Requirement: User can write off a loan
The Borrowers screen SHALL provide a write-off action on any Open or Partially Repaid loan, backed by `BorrowerService.writeOffLoan`, requiring an explicit confirmation step before submission.

#### Scenario: Write off with confirmation
- **WHEN** a user triggers write-off on a loan and confirms
- **THEN** the loan's status becomes Written Off and it no longer shows a repay action

#### Scenario: Write-off without confirmation has no effect
- **WHEN** a user opens the write-off confirmation and dismisses it without confirming
- **THEN** the loan's status is unchanged

### Requirement: User can change a loan's due date
The Borrowers screen SHALL provide a change-due-date action on any loan, regardless of status, backed by `BorrowerService.updateDueDate`, and SHALL NOT expose any action to edit a loan's amount or delete it.

#### Scenario: Change due date on an open loan
- **WHEN** a user changes an open loan's due date to a future date
- **THEN** the loan's due date updates and any overdue treatment based on the prior date is recalculated on next read

#### Scenario: No amount or delete action present
- **WHEN** a user views any loan's available actions
- **THEN** no action to edit its amount or delete it is present, regardless of status

### Requirement: Borrowers navigation link is enabled
The sidebar navigation entry for Borrowers SHALL be enabled, linking to `/borrowers`.

#### Scenario: Navigating to Borrowers
- **WHEN** an authenticated user clicks "Borrowers" in the sidebar
- **THEN** they are taken to `/borrowers`, which renders without error

### Requirement: Borrowers screen remains usable at phone widths
The borrower list/detail layout and the add-borrower/lend/repay/write-off/change-due-date forms SHALL remain fully usable at phone widths without horizontal scrolling or clipped figures.

#### Scenario: Borrowers screen viewed at 375px width
- **WHEN** the Borrowers screen is loaded at a 375px viewport width
- **THEN** borrower entries stack in a single column with all figures (outstanding amount, due date) visible without clipping, and every form presents as single-column
