## MODIFIED Requirements

### Requirement: Settings screen shows a Profile section
The Settings screen SHALL include a Profile section displaying the current user's name and email, with a form to edit them and a separate form to change password. Both forms SHALL validate fields client-side (format/shape rules) before submission, using the same schemas their Server Actions validate with; whether an email is already in use by another user, or the current password is correct, remain server-side checks.

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

#### Scenario: Field-level errors appear before submit
- **WHEN** the user blurs a malformed email field on the profile form, or a too-short new-password field on the change-password form
- **THEN** that field's error is shown immediately, without submitting the form
