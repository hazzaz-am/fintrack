## ADDED Requirements

### Requirement: Settings screen is reachable from navigation
The system SHALL provide a `/settings` screen reachable from the sidebar, and the sidebar's Settings entry SHALL no longer be disabled once this screen ships.

#### Scenario: Navigating to Settings
- **WHEN** an authenticated user selects "Settings" in the sidebar
- **THEN** they are taken to the Settings screen, and the sidebar indicates Settings as the active section

### Requirement: Settings screen shows a Profile section
The Settings screen SHALL include a Profile section displaying the current user's name and email, with a form to edit them and a separate form to change password.

#### Scenario: Viewing profile
- **WHEN** the authenticated user opens Settings
- **THEN** the Profile section displays their current name and email

#### Scenario: Updating name or email
- **WHEN** the user submits the profile form with a new name and/or email
- **THEN** the system updates the user's record and the section reflects the new values without requiring a page reload

#### Scenario: Editing profile with an email already in use
- **WHEN** the user submits the profile form with an email belonging to a different existing user
- **THEN** the system rejects the update with a validation error and the user's email remains unchanged

#### Scenario: Changing password
- **WHEN** the user submits the change-password form with their correct current password and a valid new password
- **THEN** the system updates the password hash and the form clears, without navigating away from Settings

#### Scenario: Changing password with wrong current password
- **WHEN** the user submits the change-password form with an incorrect current password
- **THEN** the system rejects the change with a validation error and the password remains unchanged

### Requirement: Settings screen shows a Categories section
The Settings screen SHALL include a Categories section listing the user's income and expense categories, with actions to create, rename, and delete each one.

#### Scenario: Viewing categories
- **WHEN** the authenticated user opens Settings
- **THEN** the Categories section lists all of their categories, grouped or labeled by type (Income/Expense)

#### Scenario: Creating a category from Settings
- **WHEN** the user submits the category form with a name and type
- **THEN** the new category appears in the list and becomes available on transaction forms

#### Scenario: Renaming a category
- **WHEN** the user edits an existing category's name and saves
- **THEN** the category's name updates in the list and everywhere it's referenced (transaction history, breakdown charts)

#### Scenario: Attempting to delete a category still in use
- **WHEN** the user opens the delete confirmation for a category that is referenced by one or more existing transactions
- **THEN** the dialog shows how many transactions reference it and does not offer a way to proceed with deletion from there — the user must reassign those transactions to a different category (on the Transactions screen) before the category can be deleted

#### Scenario: Deleting an unused category
- **WHEN** the user deletes a category with no transactions referencing it
- **THEN** the category is removed from the list immediately
