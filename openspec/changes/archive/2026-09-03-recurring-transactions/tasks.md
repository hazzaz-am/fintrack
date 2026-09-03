## 1. Schema & Migration

- [x] 1.1 Add `RecurringTransactionType` (`INCOME`, `EXPENSE`), `RecurringFrequency` (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`), and `RecurringTransactionStatus` (`ACTIVE`, `INACTIVE`) enums to `prisma/schema.prisma`
- [x] 1.2 Add `RecurringTransaction` model per design.md's Data Model (name, accountId, categoryId, type, amount, frequency, startDate, endDate?, status, description?)
- [x] 1.3 Add nullable `recurringTransactionId` column + index to `Transaction`; add the relation — no change to the existing `transactions_type_shape_check` CHECK constraint (design.md D25)
- [x] 1.4 Generate and run the migration; verify against local Postgres
- [x] 1.5 Add Zod schemas for create/update recurring-transaction input, validating category type matches template type and account/category ownership

## 2. Slot Computation (core logic)

- [x] 2.1 Implement a pure `resolveCurrentSlot(startDate, frequency, endDate?, reference = today)` helper returning `{ slotStart, slotEnd } | null` using the same `date-fns` primitives as `date-range.ts` (design.md D23) — `null` when the template hasn't started yet or is past its `endDate`
- [x] 2.2 Unit test `resolveCurrentSlot` directly for all four frequencies, including a not-yet-started template, a template past its end date, and slot boundaries around today

## 3. RecurringTransactionService

- [x] 3.1 Implement `create(userId, input)` — validates owned account/category and matching category type, defaults `status: ACTIVE`
- [x] 3.2 Implement `update(userId, id, input)` — prospective only; does not touch previously generated transactions (design.md D27)
- [x] 3.3 Implement `list(userId)` — all templates for the user, active and inactive
- [x] 3.4 Implement `archive(userId, id)` — sets `status: INACTIVE`, unconditional, no un-archive path (design.md D28), mirroring `AccountService.archive`
- [x] 3.5 Implement `getDueTemplates(userId)` — for each active template, resolve its current slot (task 2.1) and check whether a linked `Transaction` falls within it; return only templates that are due, with the slot's suggested date
- [x] 3.6 Implement `confirm(userId, id, input)` — creates a `Transaction` (type/account/category from the template, amount/date/description overridable by `input`) linked via `recurringTransactionId`, inside a `prisma.$transaction`; reject if the template is not currently due or not owned by the user

## 4. Route Handlers

- [x] 4.1 Add Route Handlers for recurring-transaction CRUD (`/api/recurring-transactions`, `/api/recurring-transactions/[id]`), each scoped via `requireAuth()`
- [x] 4.2 Add Route Handler for archiving a template
- [x] 4.3 Add Route Handler for listing due templates (`/api/recurring-transactions/due`)
- [x] 4.4 Add Route Handler for confirming a due template (`/api/recurring-transactions/[id]/confirm`)

## 5. Dashboard — Due Recurring Widget

- [x] 5.1 Add a "Due Recurring" widget to the Dashboard, sourced from `RecurringTransactionService.getDueTemplates` (the same server-side data source the `/api/recurring-transactions/due` route wraps), listing name + amount + a one-click confirm action — mirroring the existing "Upcoming Investment Maturities" widget's layout
- [x] 5.2 Confirm action is a Server Action (`confirmRecurringTransactionAction`, consistent with the rest of the app's mutation pattern) that revalidates the affected paths and removes the item from the widget without a full page reload
- [x] 5.3 Empty state when no templates are currently due

## 6. Recurring Transactions Management Screen

- [x] 6.1 Add a screen/section listing all templates (active and inactive) with create/edit/deactivate actions
- [x] 6.2 Create form: name, amount, account, category (filtered to the selected type), type, frequency, start date, optional end date
- [x] 6.3 Edit form reuses create form, preloaded with current values; saving does not affect previously generated transactions
- [x] 6.4 Deactivate action with a confirmation step, since there's no un-archive path

## 7. Tests

- [x] 7.1 Test: a template with `startDate` today and no prior transactions is due
- [x] 7.2 Test: a template with a linked transaction inside the current slot is not due
- [x] 7.3 Test: a template unconfirmed for three elapsed monthly slots is due exactly once, not three times (design.md D26)
- [x] 7.4 Test: an inactive template never appears in `getDueTemplates`
- [x] 7.5 Test: a template past its `endDate` never appears as due
- [x] 7.6 Test: confirming a due template creates a transaction that participates in `TransactionService.getSummary`/`AnalyticsService` exactly like a manually entered one
- [x] 7.7 Test: confirming rejects if the template is not currently due
- [x] 7.8 Test: editing a template's amount does not change previously generated transactions' recorded amounts
- [x] 7.9 Test: creating a template with a category type mismatch or a transfer type is rejected

## 8. Cross-Cutting Polish

- [x] 8.1 Verify every `RecurringTransactionService` method scopes queries by `userId`
- [x] 8.2 Confirm `amount` uses `Decimal`/`NUMERIC`, never floating point
- [x] 8.3 Run full test suite (existing + new) and fix any regressions before moving on
