## Context

`savings-goals` already models allocation as an append-only ledger (`GoalAllocationEvent`), and `savings-goal-service.ts` already derives `unallocated = computedBalance − sum(GoalAllocationEvent for account)` — today used only to reject *new allocations* that exceed it (`ALLOCATION_EXCEEDS_BALANCE`). Separately, `transactions` capability enforces a hard, blocking `INSUFFICIENT_BALANCE` check (chronological running balance ≥ 0) on `EXPENSE`, outgoing `TRANSFER`, and (by extension) `INVESTMENT_CONTRIBUTION` — but that check has no concept of allocation; it only cares whether the raw balance goes negative. The only place allocation and spending currently intersect is the existing "Over-Allocation Warning" requirement, which is explicitly non-blocking and only fires for *retroactive* transaction edits.

This design adds a new, blocking, consent-gated guard for *new* outflow transactions that would spend into an account's reserved (allocated) buffer — distinct from, and layered on top of, both existing mechanisms.

## Goals / Non-Goals

**Goals:**
- Block (via explicit typed consent) new `EXPENSE` / `INVESTMENT_CONTRIBUTION` / outgoing `TRANSFER` transactions that would eat into a goal's reserved allocation, unless the user consents.
- Let the user optionally promise the dipped amount will return by a date, and track that promise (partial returns, write-off) until resolved.
- Surface unresolved promises persistently on the dashboard until resolved.
- Keep the existing `savings-goals` (`allocate`, `moveAllocation`, over-allocation warning) and `transactions` (insufficient-balance, future-date) requirements completely unchanged.

**Non-Goals:**
- Not changing how retroactive transaction edits are handled (still the existing non-blocking over-allocation warning).
- Not auto-detecting repayment from incoming transactions (repayment is always an explicit user action).
- Not supporting proportional/automatic splitting of a shortfall across multiple goals — the user always types exact per-goal amounts.
- Not reconciling an *edited* transaction's amount against its original dip/promise — edits are evaluated independently, from scratch.

## Decisions

### D1: Guard fires on EXPENSE + INVESTMENT_CONTRIBUTION + outgoing TRANSFER, not just expenses
All three are outflows already funneled through the same `assertChronologicalBalanceNonNegative` check in `transaction-service.ts`. Reserved-fund protection follows the same "any outflow" rule for consistency — otherwise a user could bypass the guard entirely by transferring reserved money to another own account first. Incoming transfers and income are never checked (they only ever raise a balance).

### D2: Guard evaluates strictly after INSUFFICIENT_BALANCE
"Can't afford it at all" is a harder stop than "can afford it but it's reserved." If a transaction already fails the existing balance check, the reservation dialog never appears — there's no point asking for consent to dip into a reserve for a transaction that's going to be rejected anyway. Implementation-wise this means the shortfall check runs only after `assertChronologicalBalanceNonNegative` succeeds, inside the same transaction-service methods.

### D3: Shortfall = (amount + vatAmount) − unallocated, only the shortfall portion touches the ledger
Matches the existing convention that VAT is real money leaving the account (already combined with `amount` in the `INSUFFICIENT_BALANCE` check). Only the portion that actually eats into the reserve becomes a negative `GoalAllocationEvent` — not the full transaction amount — since `GoalAllocationEvent` already represents "how much of this account is reserved," and the rest of the transaction was funded from money that was never reserved to begin with.

### D4: User manually selects goal(s) and types exact per-goal amounts; no auto-split
When an account has multiple goals sharing its reservation, only the user knows which goal a given expense is conceptually "borrowing" from. Proportional/even auto-split was considered and rejected: it would silently create multiple promises for what the user thinks of as one event, and wouldn't match their actual intent. The confirm action stays disabled until the typed per-goal amounts sum exactly to the shortfall.

### D5: Two-step wizard; CONCENT gates Step 1 → Step 2, nothing persists until final Confirm
Step 1: warning + literal `CONCENT` text match, required regardless of which path (permanent vs. returning) is chosen later — matches the user's explicit requirement that consent is mandatory either way. Step 2 (goal/amount selection + permanent-or-returning choice per goal) is only reachable after Step 1's match. The dialog is fully cancelable at any point before the Step 2 Confirm; no transaction, allocation event, or promise is written until then.

### D6: New `GoalReservationPromise` entity, one per goal per dip, independently resolvable
Considered folding "the return commitment" directly into `GoalAllocationEvent` (e.g., a nullable `dueDate` column) but rejected it: a promise has its own lifecycle (open → partially resolved → resolved/written-off) and its own mutable `remainingAmount`, which doesn't fit an append-only event log. Instead, `GoalReservationPromise` is a separate mutable record *linked to* the negative `GoalAllocationEvent` it originated from (and to the goal/account/originating transaction), while all ledger *movement* (partial returns) still happens via ordinary positive `GoalAllocationEvent` rows linked back to the promise. Multiple promises against the same goal (from separate dips) are tracked and shown independently — never merged into one running total — so each keeps its own deadline and can be resolved independently.

### D7: Partial fulfillment supported; independent "write off remainder" action
A promise's `remainingAmount` can be paid down incrementally via repeated "return" actions (each writes a positive `GoalAllocationEvent` for the entered amount and decrements `remainingAmount`), reaching `RESOLVED` at zero. At any time — whether nothing, some, or (trivially) all of it has been returned — the user can instead "write off" whatever `remainingAmount` is still outstanding, closing the promise as `WRITTEN_OFF` with no further allocation event (the original negative event stands as the permanent reduction). This was chosen over an all-or-nothing model because real repayment is rarely a single lump sum, and over forcing every promise to either be fully repaid or nag forever with no exit.

### D8: Overdue promises persist indefinitely with a visual-only state change
When `dueDate` passes with `remainingAmount > 0`, the promise (and its banner line) switches to an overdue/red style but is never auto-expired or auto-removed — it stays until the user explicitly returns or writes it off. This matches the intent of a nag that can't be silently forgotten, and avoids inventing an auto-expiry policy the user never asked for.

### D9: Delete auto-reverses; edit-amount does not
Deleting the transaction that caused a dip means the dip's cause no longer exists, so its effect should be undone automatically: every `GoalAllocationEvent` this guard created off that transaction gets a matching reversing positive event, and any linked promise is auto-cancelled (no partial-return bookkeeping needed, since there's nothing left to return against). Editing the transaction's *amount* is deliberately left alone — there is no unambiguous way to know "how much of the new amount is newly-reserved money" without fragile re-derivation, so the original dip/promise stands untouched and the edited amount is checked fresh against whatever buffer remains at that point, independently (it may or may not trigger its own new instance of this same guard).

### D10: Dashboard-only banner, reusing the existing `dashboard-ui` capability
The user specifically asked for top-of-dashboard visibility; this is added as a new requirement on the existing `dashboard-ui` spec (alongside its other independently-sourced widgets) rather than inventing a new global-notification capability, since `dashboard-ui` already aggregates several independent services onto one page.

## Risks / Trade-offs

- **[Risk]** A user could game the "goal selection" step to always dip the same low-priority goal, defeating the spirit of the guard → **Mitigation**: out of scope; the guard's purpose is visibility and explicit consent, not preventing all possible reallocation — the existing `allocate`/`moveAllocation` flows already let users freely reassign reserved funds anyway.
- **[Risk]** Partial-return bookkeeping adds real state (remainingAmount, multiple possible resolutions) vs. a simpler all-or-nothing promise → **Mitigation**: accepted deliberately (D7) since it matches how real repayment behaves; kept to a single `remainingAmount` field plus two actions (return, write-off) rather than a full repayment-history sub-ledger, to bound the complexity.
- **[Risk]** Concurrent transaction creation could race against the unallocated-balance computation the same way the existing insufficient-balance check already can → **Mitigation**: reuse the same `prisma.$transaction` pattern already used by `recordExpense`/`recordTransfer`/`SavingsGoalService.allocate`, computing balance and unallocated amount inside the transaction, consistent with existing code.
- **[Trade-off]** Editing a transaction's amount never reconciles the original promise (D9), which means a user who *reduces* an expense back below the original shortfall still has a stale promise for money that's no longer borrowed → **Mitigation**: accepted; the user can write off or manually resolve the stale promise, and this matches the user's own stated preference for keeping edit semantics simple over building re-derivation logic.

## Migration Plan

- Additive only: new `GoalReservationPromise` table/model, new nullable link field(s) on `GoalAllocationEvent` (e.g., `sourceTransactionId`, `promiseId`) via a standard Prisma migration. No existing columns change type or meaning.
- No backfill needed — no such promises exist prior to this change.
- Rollout is a single deploy; no feature flag needed since the guard only activates when a shortfall is actually computed (zero behavior change for accounts/transactions that never dip into a reserve).

## Open Questions

- Exact new-model field names/table shape for `GoalReservationPromise` and its link to `GoalAllocationEvent`/`Transaction` are left to implementation (tasks.md), guided by the existing Prisma schema conventions in this codebase.
- Whether `INVESTMENT_CONTRIBUTION` recording currently lives in `transaction-service.ts` or a separate investment service was not directly confirmed in this exploration — tasks.md implementation should locate the actual contribution-recording code path before wiring in the guard.
