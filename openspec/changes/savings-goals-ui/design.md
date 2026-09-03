## Context

`SavingsGoalService` (see `openspec/specs/savings-goals/spec.md`) already covers create/allocate/moveAllocation/getProgress/list/getAccountAllocationStatus as an append-only `GoalAllocationEvent` ledger, mirroring how account balances and investment principal are derived rather than stored. There is no screen for any of this — the sidebar entry is hard-disabled. `update` and `archive` don't exist at any layer.

The closest existing precedent for "edit + archive" on a card-based, user-owned resource is Accounts: `AccountService.update`/`archive`, a `PATCH /api/accounts/[accountId]` route, a separate `POST /api/accounts/[accountId]/archive` route + `archiveAccountAction` server action, and an `ArchiveAccountDialog` built on `AlertDialog` with a confirm step. `archive()` there is unconditional — no balance check, no un-archive path. Investments supplies the second precedent: a card-grid screen with an Active/Planned grid plus a collapsed "Past" section, `useActionState`-backed form dialogs, and a `formatMoney`/`Badge` vocabulary for money and status.

## Goals / Non-Goals

**Goals:**
- Close the `update`/`archive` gap on `SavingsGoalService` using the exact pattern already established for `AccountService`.
- Ship a `/savings-goals` screen that reuses the Investments page skeleton and the Accounts archive-confirmation pattern, rather than inventing new conventions.
- Make "achieved" and "over-allocated" visible without adding new stored state.

**Non-Goals:**
- Accounts page allocation breakdown (separate follow-on, see proposal.md).
- Un-archiving a goal. Accounts has no restore path either; adding one here would be new scope, not precedent-following.
- Any change to `allocate`/`moveAllocation` server-side behavior — this change only adds a UI in front of them.

## Decisions

**D1 — Archive is unconditional and one-directional, mirroring `AccountService.archive`.**
`SavingsGoalService.archive` sets `status: "ARCHIVED"` with no check on remaining allocated amount. Money allocated to an archived goal is *not* deallocated or moved — the `GoalAllocationEvent` rows are untouched, since they're an append-only ledger (existing `savings-goals` spec: "never a single mutable... field"). An archived goal simply moves to the screen's collapsed section, same treatment as a Matured investment. No un-archive action ships in this change, matching the Accounts precedent.

**D2 — "Achieved" is computed at render time, never written to `status`.**
`SavingsGoalStatus` stays `ACTIVE`/`ARCHIVED` only — no `ACHIEVED` value is ever assigned. The UI computes `achieved = totalAllocated >= targetAmount` from `getProgress()`'s existing return value and shows it as a badge. Alternative considered: transition the stored status to `ACHIEVED` automatically when the threshold is crossed. Rejected because it requires a write on every allocation-affecting action (allocate, moveAllocation, and any future transaction edit that changes a contributing account's balance) just to keep a redundant field in sync, and creates an ambiguous case — a goal that crosses back below target after a `moveAllocation` out would need to silently un-achieve itself, which is surprising state to explain. Deriving it avoids all of that, at the cost of one extra read-time comparison, which is negligible.

**D3 — `update` covers name, targetAmount, targetDate, description only; no field validates against current allocation.**
Lowering `targetAmount` below the already-allocated total is allowed — it just means the goal is immediately "achieved" per D2, which is correct behavior (the user retargeted a goal they'd already funded). This matches `AccountService.update`, which similarly never cross-checks against balance.

**D4 — Route shape mirrors Accounts exactly**: `PATCH /api/savings-goals/[goalId]` for `update` (body validated by a new `updateSavingsGoalSchema`, same partial-optional-fields shape as `updateAccountSchema`), `POST /api/savings-goals/[goalId]/archive` for `archive` (no body). Both call `getOwnedGoalOrThrow` first, same as every other method in the service.

**D5 — Move-allocation is a dialog on the goal card, not a new screen or inline table edit.**
`moveAllocation` needs a `fromGoalId`, `toGoalId`, `accountId`, and `amount`. Opening it from a specific goal's card fixes `fromGoalId` and offers only the accounts *that goal* already has allocations from (from `getProgress().byAccount`), which is also the natural cap on `amount` client-side, avoiding a round trip for the obvious over-move case (same UX role as the client-side principal guard on Investments' `RecordMaturityDialog`).

**D6 — Over-allocation badge reads `getAccountAllocationStatus` per contributing account, computed in the server page, not per-card client fetches.**
The page already fetches `getProgress` for every goal to build `byAccount`; it additionally calls `getAccountAllocationStatus` once per distinct account referenced across all goals (deduplicated), and passes the resulting `isOverAllocated` map down — same "compute once in the server component, pass flattened data to client" shape the Investments page already uses for `daysUntilMaturity`.

## Risks / Trade-offs

- **[Risk]** Archiving a goal with money still allocated to it could read as "the money disappeared" if a user doesn't notice the collapsed section. → **Mitigation**: the archived section stays visible (collapsed, not hidden) with a count, same as Investments' "Past investments (N)", and the per-account breakdown still renders on archived cards.
- **[Risk]** `getAccountAllocationStatus` is O(accounts referenced) sequential-looking calls if implemented naively. → **Mitigation**: dedupe account IDs across all goals before calling, same n as the number of distinct accounts a user actually funds goals from (typically small).
- **[Trade-off]** No un-archive path means an accidental archive requires editing the database or (later) a dedicated restore feature. Accepted because Accounts has the identical limitation today and hasn't needed one.

## Open Questions

None outstanding — the four questions raised during exploration (backend scope, achieved-state modeling, Accounts page scope, move-allocation UX) are resolved by D1–D6 above.
