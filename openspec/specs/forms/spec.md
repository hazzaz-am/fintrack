# forms Specification

## Purpose

TBD - created by syncing change migrate-forms-to-tanstack-form. Update Purpose after archive.

## Requirements

### Requirement: Forms validate fields client-side before submit
Every data-entry form in the app SHALL validate its fields client-side using the same Zod schema its Server Action already validates with, showing errors on blur (first touch) and on change thereafter, in addition to the existing server-side validation.

#### Scenario: Field becomes invalid after being touched
- **WHEN** a user blurs a required field left empty, or types a value that fails the domain schema
- **THEN** a field-level error appears immediately, without waiting for a form submission

#### Scenario: Field becomes valid after being corrected
- **WHEN** a user corrects a previously invalid, touched field to a value that passes the domain schema
- **THEN** the field-level error clears immediately, without a form submission

#### Scenario: Submit re-validates the whole form
- **WHEN** a user submits a form with one or more fields failing the domain schema
- **THEN** the submission is blocked client-side and every failing field shows its error, without a round trip to the Server Action

### Requirement: Server-dependent rules stay server-checked and surface through the same error slot
A validation rule that depends on live server state (e.g. an email already registered by another user, an incorrect current password, an amount exceeding an account's current unallocated balance) SHALL continue to be checked by the Server Action, with its error displayed through the same field-level error presentation used for client-validated fields.

#### Scenario: Server rejects a value that passed client-side validation
- **WHEN** a user submits a field that is well-formed enough to pass client-side schema validation but is rejected by the Server Action for a state-dependent reason
- **THEN** the Server Action's error is shown in the same field-level error slot the client-side validation would have used

### Requirement: Submission continues to go through the existing Server Action
Migrating a form's client-side validation and submission handling to TanStack Form SHALL NOT change the Server Action it submits to, that action's parameters, or its authorization/validation behavior.

#### Scenario: Server Action is unchanged
- **WHEN** a migrated form is submitted with valid input
- **THEN** the same Server Action that handled this form before migration is invoked with the same shape of input, and performs the same mutation
