## Context

Every capability shipped so far (`core-financial-architecture` D1/D2, `investment-tracking` D6-D9) follows one rule: never store a "current state" field a write path has to remember to update — derive it from the `Transaction` ledger instead. `Account.balance`, `SavingsGoal`'s saved amount, and `Investment.principal` are all computed on read, never mutated on write.

Recurring transactions look, at first glance, like they break that rule: the PRD's own schema sketch (§28) has a `nextOccurrence` column that something has to advance. This project has no background-job or cron infrastructure (§33's stack is Next.js + Postgres, nothing else), so a design that depends on a scheduled process to keep `nextOccurrence` current isn't viable here anyway — which forces the same derivation approach used everywhere else, and it turns out to fit just as well as it did for `Investment.principal`.

The other established precedent this design leans on is `investment-tracking` D8: status transitions (there, an investment maturing) are user-asserted, never automatic on the passage of time. Recording a due recurring transaction follows the identical shape — the system tells the user something is due; the user decides whether and when to confirm it.

## Goals / Non-Goals

**Goals:**
- Let the user define a repeating Income or Expense once (name, amount, account, category, frequency) instead of re-entering it every period.
- Surface what's currently due without any background process — "due" is a query, evaluated when the user is in the app.
- Every generated `Transaction` remains an explicit, user-reviewed, independently editable ledger row — confirming a due template is a normal `TransactionService`-style write, not a special silent insert.
- Continue the derive-don't-store pattern: no field anywhere holds "the next occurrence date" as mutable state.

**Non-Goals:**
- Recurring **transfers** — scope is Income/Expense only (see D24).
- Any form of automatic, unattended transaction creation — a due template never becomes a `Transaction` without an explicit confirm action.
- Backfilling multiple missed periods — at most one occurrence per template is ever "due" at a time (see D26).
- Push/email notifications about due items — that's the separate Phase 2 "Notifications" item (§36); this change only surfaces due state inside the app (Dashboard widget + management list).
- Budget limits — separate Phase 2 feature (§38), unrelated to this change.

## Decisions

### D23 — Due-ness is derived from a schedule anchor, not from stored state or from chaining off transaction dates

**Decision:** No `nextOccurrence` column. For a template with `startDate` S and `frequency` F, the "current scheduled slot" is computed arithmetically: `k = number of whole periods of F between S and today` (e.g. `differenceInCalendarMonths` for monthly), giving `slotStart = addPeriod(S, k, F)` and `slotEnd = addPeriod(S, k+1, F)`. The template is due when `slotStart <= today` and no `Transaction` with this template's id has a `transactionDate` inside `[slotStart, slotEnd)`.

**Alternatives considered:**
- *Chain off the last confirmed transaction's date* (next due = last confirmation + one period): rejected because if a user confirms a slot a few days late and doesn't correct the date, every subsequent slot drifts later by the same amount, silently decoupling the schedule from what the user actually set up (e.g. "the 1st of every month" slowly becomes "the 5th").
- *Stored `nextOccurrence`, advanced on confirm*: rejected as the exact mutable-state pattern D1/D2/D7 already avoid — nothing here would keep it correct except application code remembering to update it, and there's no scheduled process to double-check it between visits.

### D24 — Scope is Income/Expense only; no recurring Transfer

**Decision:** `RecurringTransaction.type` is `INCOME | EXPENSE`. There is no recurring-transfer concept in this change.

**Rationale:** every PRD example (§13) is an expense; a recurring-transfer would need the same three-way shape validation `Transaction` already carries for `TRANSFER` (source/destination instead of account/category — see the `transactions_type_shape_check` CHECK constraint), which is real added surface area for a use case the PRD never actually asks for. Confirmed as an explicit scope decision, not an oversight — see proposal discussion.

### D25 — Confirming a due slot creates an ordinary `Transaction`; no new `TransactionType`

**Decision:** `Transaction` gains one nullable column, `recurringTransactionId`, with an index. A confirmed occurrence is a normal `INCOME`/`EXPENSE` row — same shape, same CHECK constraint, same aggregation behavior in `TransactionService.getSummary`/`AnalyticsService` as any manually entered transaction. The FK is purely provenance ("this row came from template X"); nothing reads it except `RecurringTransactionService.getDueTemplates` (to find the linked rows for the current slot) and the UI (to show "generated from Home" on a transaction, if desired later).

**Rationale:** this is the same move as `investment-tracking` D6 — ride the existing ledger and its existing aggregation, rather than inventing a parallel bookkeeping path or a new type that every downstream consumer (`AccountService.computeBalances`, `AnalyticsService`) would need to learn about.

### D26 — Only the current slot is ever due; no backfill queue

**Decision:** `getDueTemplates` reports at most one due slot per template — whatever `slotStart`/`slotEnd` the D23 computation currently resolves to. If a user hasn't opened the app in three months, the two earlier unconfirmed slots are never surfaced, never counted, and never retroactively creatable through this feature.

**Rationale:** explicit product decision (see proposal) — the system cannot know whether a real-world payment happened during a gap the user didn't log, so it doesn't assume a queue of identical historical transactions. This also keeps the due-computation O(1) per template (one arithmetic slot, one existence check) rather than needing to enumerate every unconfirmed slot since `startDate`.

### D27 — Editing a template is prospective only

**Decision:** `RecurringTransactionService.update` changes the template's current fields only. Since D23's slot computation always reads the template's *current* `startDate`/`frequency`/`amount`, an edit takes effect on the next unconfirmed slot; it never rewrites a `Transaction` already created from an earlier confirm. Each generated `Transaction` keeps the amount/date/description it was created with, exactly as ledger rows already do everywhere else in this codebase.

### D28 — Deactivating a template stops future due slots; past transactions are untouched

**Decision:** `archive`/deactivate sets `status: INACTIVE` (mirrors `AccountService.archive`/`SavingsGoalService.archive`: unconditional, no un-archive path, does not touch related rows). An inactive template is excluded from `getDueTemplates` entirely; its previously generated `Transaction` rows are ordinary ledger rows and are never deleted or modified.

## Data Model

```
model RecurringTransaction {
  id          String   @id @default(cuid())
  userId      String
  name        String
  accountId   String
  categoryId  String
  type        RecurringTransactionType   // INCOME | EXPENSE
  amount      Decimal  @db.Decimal(14, 2)
  frequency   RecurringFrequency         // WEEKLY | MONTHLY | QUARTERLY | YEARLY
  startDate   DateTime
  endDate     DateTime?
  status      RecurringTransactionStatus @default(ACTIVE) // ACTIVE | INACTIVE
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Transaction (existing model) gains:
//   recurringTransactionId String?  (nullable FK, indexed)
// No change to the type-shape CHECK constraint (D25) — a
// recurring-generated row is a normal INCOME/EXPENSE shape.
```

`endDate`, if set, bounds the slot computation: a slot whose `slotStart` falls after `endDate` is never due.

## Risks / Trade-offs

- **[Risk]** Editing `frequency` or `startDate` on a template with existing history changes the anchor the slot arithmetic is computed from, which could make the "current slot" jump forward or (rarely) land on a date already covered by a prior confirmation → **Mitigation:** accepted for this change; schedule edits are rare, the new due state is immediately visible to the user after the edit (nothing silent), and this is the same class of accepted edge case as D3's soft over-allocation invariant in `savings-goals`.
- **[Risk]** Weekly-frequency slot boundaries depend on `date-fns`'s week-start convention (already used by `resolveDateRange`'s `startOfWeek`/`endOfWeek`) → **Mitigation:** reuse those same primitives rather than introducing a second week-boundary definition.
- **[Trade-off]** No index-backed "next due date" to query directly — `getDueTemplates` computes the slot per active template in application code → **Mitigation:** acceptable given this is a single-user app where a user's template count is at most dozens, not the kind of scale that needs a precomputed/indexed due-date.

## Migration Plan

Additive only: new `RecurringTransaction` table, two new enums, one nullable indexed FK column on `transactions`. No backfill of existing data required (existing transactions simply have `recurringTransactionId = NULL`). Rollback is a straightforward down-migration (drop column, drop table, drop enums) since nothing else depends on the new column yet.
