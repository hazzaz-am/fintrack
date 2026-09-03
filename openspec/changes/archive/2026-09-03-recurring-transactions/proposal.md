## Why

Users have real, repeating financial events every month — rent, family support, subscriptions — that today must be re-entered by hand each time (PRD §13). Nothing currently reminds the user which of these are due, so they either forget them or re-derive the same amount/account/category from memory every month. A recurring template that surfaces what's due and lets the user confirm it in one click removes that repeated manual work while keeping every actual transaction an explicit, reviewed act — consistent with how this codebase already treats time-based state (investment maturity is never auto-applied; see `investment-tracking` design.md D8).

## What Changes

- Add `RecurringTransaction`: a template (name, amount, account, category, type, frequency, start date, optional end date, active/inactive) describing a repeating Income or Expense — not a repeating Transfer.
- "Due" is computed, not stored: no `nextOccurrence` column. Whether a template is due for the current period is derived from its `startDate`/`frequency` and whether a `Transaction` already links to it for that period.
- `Transaction` gains an optional `recurringTransactionId` so a generated transaction can be traced back to the template that produced it, without the template needing to track anything about its own history.
- Confirming a due template creates one real, editable `Transaction` (pre-filled from the template) via an explicit user action — never inserted automatically on a timer or on page load.
- Missed periods do not accumulate: if multiple periods have elapsed since the template was last confirmed, only the current period is ever surfaced as due. The system does not offer to backfill skipped months.
- Editing a template only affects future occurrences; a `Transaction` already generated from it keeps its own recorded amount/date/description regardless of later template edits.
- Deactivating/archiving a template stops it from ever appearing as due again; it never touches or deletes `Transaction` rows already generated from it.
- Dashboard gains a "Due Recurring" widget listing currently-due templates with a one-click "confirm" action, mirroring the existing "Upcoming Investment Maturities" widget.
- A recurring-transactions management screen lets the user create, edit, and activate/deactivate templates.

## Capabilities

### New Capabilities
- `recurring-transactions`: recurring transaction templates — CRUD, due-computation, and confirming a due occurrence into a real transaction.

### Modified Capabilities
- `dashboard-ui`: adds a "Due Recurring" widget to the Dashboard's set of displayed sections.

## Impact

- **Schema**: new `RecurringTransaction` model; new nullable `recurringTransactionId` FK + index on `Transaction` (additive, no change to the existing type-shape CHECK constraint since recurring-generated rows are ordinary `INCOME`/`EXPENSE` transactions).
- **Services**: new `RecurringTransactionService` (create/update/list/archive, `getDueTemplates`, `confirmOccurrence`); `TransactionService`/`AnalyticsService`/`AccountService` are unaffected since a confirmed occurrence is just a normal transaction.
- **API**: new routes under `/api/recurring-transactions` (CRUD, `due`, `confirm`).
- **UI**: Dashboard gains a "Due Recurring" widget; new recurring-transactions management screen (list/create/edit/pause templates).
- **No changes** to Transfers, Investments, Savings Goals, or existing Transaction behavior.
