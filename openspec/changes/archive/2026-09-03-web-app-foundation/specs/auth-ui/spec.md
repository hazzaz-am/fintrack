## ADDED Requirements

### Requirement: User can register a new account
The register page SHALL create a new user via the existing registration service and validation, then establish a session.

#### Scenario: Valid registration
- **WHEN** a visitor submits the register form with a unique email and a password meeting the existing validation rules
- **THEN** a new user is created, a session is established, and the visitor is redirected to `/accounts`

#### Scenario: Duplicate email
- **WHEN** a visitor submits the register form with an email that already belongs to an existing user
- **THEN** the form displays an inline error and no new user is created

#### Scenario: Invalid input
- **WHEN** a visitor submits the register form with input that fails existing validation (e.g. malformed email, password below the minimum)
- **THEN** the form displays field-level errors and no new user is created

### Requirement: User can log in
The login page SHALL authenticate a visitor via the existing auth service, then establish a session.

#### Scenario: Valid credentials
- **WHEN** a visitor submits the login form with an email and password matching an existing user
- **THEN** a session is established and the visitor is redirected to `/accounts`

#### Scenario: Invalid credentials
- **WHEN** a visitor submits the login form with a non-matching email/password combination
- **THEN** the form displays an inline error, no session is established, and the specific reason (wrong email vs. wrong password) is not distinguishable from the error shown

### Requirement: Already-authenticated visitors are redirected away from auth pages
`/login` and `/register` SHALL NOT render their forms to a visitor who already has a valid session.

#### Scenario: Logged-in user navigates to /login
- **WHEN** a visitor with a valid session requests `/login` or `/register`
- **THEN** they are redirected to `/accounts` without seeing the form
