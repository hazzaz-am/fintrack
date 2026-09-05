## ADDED Requirements

### Requirement: Dashboard shows a reserved-funds return banner
The Dashboard SHALL display, at the top of the page, one line per open or overdue `GoalReservationPromise` belonging to the user, each showing the promise's goal name, `remainingAmount`, and `dueDate`, sourced from the `goal-reservation-guard` capability. Each line SHALL provide a return action (recording a partial or full return against that promise) and a write-off action (closing the promise for its outstanding `remainingAmount`). A promise whose `dueDate` has passed SHALL be visually distinguished as overdue but SHALL remain on the banner until resolved or written off. The banner SHALL be omitted entirely when the user has no open or overdue promises.

#### Scenario: One promise outstanding
- **WHEN** a user has one open `GoalReservationPromise` for ৳200 owed back to "Marriage" by a future date
- **THEN** the dashboard's top banner shows that goal name, ৳200, and the due date, with return and write-off actions available

#### Scenario: Multiple promises shown independently
- **WHEN** a user has two open promises against the same goal with different due dates
- **THEN** the banner shows both as separate lines, each independently actionable

#### Scenario: Overdue promise is visually distinguished
- **WHEN** a promise's due date has passed and its `remainingAmount` is still greater than zero
- **THEN** the banner shows that line in an overdue visual style, and it remains present rather than disappearing

#### Scenario: No promises, no banner
- **WHEN** a user has no open or overdue `GoalReservationPromise` records
- **THEN** the dashboard renders with no reservation banner present

#### Scenario: Returning from the banner
- **WHEN** a user records a full return against a promise's banner line
- **THEN** the promise becomes resolved and its line is removed from the banner on next read

#### Scenario: Writing off from the banner
- **WHEN** a user chooses the write-off action on a banner line
- **THEN** the promise becomes written-off and its line is removed from the banner on next read
