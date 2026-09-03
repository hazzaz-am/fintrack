## ADDED Requirements

### Requirement: Profile Update
The system SHALL allow an authenticated user to update their own name and/or email, validated with the same rules used at registration (email format, trimmed, case-insensitive, unique across users).

#### Scenario: Successful profile update
- **WHEN** an authenticated user submits a new name and/or a new, unused email
- **THEN** the system updates their `User` record and returns the updated profile

#### Scenario: Email collision on profile update
- **WHEN** an authenticated user submits an email that already belongs to a different user
- **THEN** the system rejects the update with a validation error and makes no change to the record

### Requirement: Password Change
The system SHALL allow an authenticated user to change their own password by providing their current password and a new password meeting the same policy enforced at registration (minimum 8 characters).

#### Scenario: Successful password change
- **WHEN** an authenticated user submits their correct current password and a valid new password
- **THEN** the system verifies the current password against the stored hash, replaces it with a hash of the new password, and does not store either password in plaintext

#### Scenario: Incorrect current password
- **WHEN** an authenticated user submits an incorrect current password
- **THEN** the system rejects the change without altering the stored password hash
