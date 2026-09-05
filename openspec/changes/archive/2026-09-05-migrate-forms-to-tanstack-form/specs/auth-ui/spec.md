## MODIFIED Requirements

### Requirement: User can register a new account
The register page SHALL create a new user via the existing registration service and validation, then establish a session. The register form SHALL validate fields client-side (format/shape rules) before submission, using the same schema the Server Action validates with.

#### Scenario: Valid registration
- **WHEN** a visitor submits the register form with a unique email and a password meeting the existing validation rules
- **THEN** a new user is created, a session is established, and the visitor is redirected to `/accounts`

#### Scenario: Duplicate email
- **WHEN** a visitor submits the register form with an email that already belongs to an existing user
- **THEN** the form displays an inline error and no new user is created

#### Scenario: Invalid input
- **WHEN** a visitor submits the register form with input that fails existing validation (e.g. malformed email, password below the minimum)
- **THEN** the form displays field-level errors and no new user is created

#### Scenario: Field-level errors appear before submit
- **WHEN** a visitor blurs a malformed email field or a too-short password field
- **THEN** that field's error is shown immediately, without submitting the form

### Requirement: User can log in
The login page SHALL authenticate a visitor via the existing auth service, then establish a session. The login form SHALL validate that email and password are present and well-formed client-side before submission; whether the credentials actually match a user remains a server-side check.

#### Scenario: Valid credentials
- **WHEN** a visitor submits the login form with an email and password matching an existing user
- **THEN** a session is established and the visitor is redirected to `/accounts`

#### Scenario: Invalid credentials
- **WHEN** a visitor submits the login form with a non-matching email/password combination
- **THEN** the form displays an inline error, no session is established, and the specific reason (wrong email vs. wrong password) is not distinguishable from the error shown

#### Scenario: Empty field caught before submit
- **WHEN** a visitor blurs the email or password field while it is empty
- **THEN** a field-level error is shown immediately, without a round trip to the server
