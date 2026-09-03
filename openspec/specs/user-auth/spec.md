# user-auth Specification

## Purpose

Registration, login, logout, session management, password hashing, and per-resource authorization.

## Requirements

### Requirement: User Registration
The system SHALL allow a new user to register with a name, email, and password, storing only a hashed password (Argon2id or bcrypt), never plaintext.

#### Scenario: Successful registration
- **WHEN** a visitor submits a registration form with a unique email and a valid password
- **THEN** the system creates a new `User` record with a hashed password and does not store the plaintext password anywhere

#### Scenario: Duplicate email rejected
- **WHEN** a visitor submits a registration form with an email that already exists
- **THEN** the system rejects the registration with a validation error and does not create a new record

### Requirement: User Login
The system SHALL allow a registered user to log in with email and password, establishing a secure session on success.

#### Scenario: Successful login
- **WHEN** a user submits correct email and password
- **THEN** the system verifies the password against the stored hash and issues a signed, httpOnly, secure session cookie

#### Scenario: Failed login
- **WHEN** a user submits an incorrect password
- **THEN** the system rejects the login without revealing whether the email or the password was wrong

### Requirement: User Logout
The system SHALL allow a logged-in user to terminate their session.

#### Scenario: Successful logout
- **WHEN** a logged-in user requests logout
- **THEN** the system invalidates the session so the previous session cookie no longer grants access

### Requirement: Per-Resource Authorization
The system SHALL scope every read and write of a user-owned resource (accounts, categories, transactions, savings goals, goal allocation events) to the authenticated user's own data, and SHALL reject access to another user's resources.

#### Scenario: Accessing own resource
- **WHEN** an authenticated user requests one of their own accounts, transactions, categories, or goals
- **THEN** the system returns the resource

#### Scenario: Accessing another user's resource
- **WHEN** an authenticated user requests a resource ID that belongs to a different user
- **THEN** the system denies access (not found or forbidden) regardless of whether the ID exists

#### Scenario: Unauthenticated access
- **WHEN** a request without a valid session attempts to read or write any user-owned resource
- **THEN** the system rejects the request and requires authentication

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
