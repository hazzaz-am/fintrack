## Context

`goal-reservation-guard` already implements the full consent-gated dip mechanism: `computeShortfall` (goal-reservation-service.ts) computes `amount + vatAmount − unallocated` for an account; `enforceReservationGuard` (currently defined in transaction-service.ts, exported for reuse) throws `AppError("RESERVATION_CONSENT_REQUIRED", ..., { shortfall, unallocated, goals })` when a shortfall exists and no consent was supplied, or calls `applyReservationConsent` to write the negative `GoalAllocationEvent`(s) and optional `GoalReservationPromise` when consent is supplied. `TransactionService.recordExpense`/`recordTransfer` and `InvestmentService.contribute`/`createWithInitialContribution` all call `enforceReservationGuard` from inside their own `prisma.$transaction` callback, after their own insufficient-balance check, passing through a `consent?: ReservationConsentInput` parameter that the server action populates from a `reservationConsent` FormData field.

`BorrowerService.disburseLoan` follows the identical structural shape already (create the loan + `LOAN_DISBURSEMENT` transaction inside `prisma.$transaction`, check `assertChronologicalBalanceNonNegative`, then today: a hard `amount > unallocated` throw with no consent path). The change is to swap that last check for the same `enforceReservationGuard` call every other outflow type uses.

## Goals / Non-Goals

**Goals:**
- Loan disbursement participates in the exact same consent flow (CONCENT wizard, per-goal amount split, permanent-vs-returning choice) as expenses/investments/transfers — no parallel UI or backend mechanism.
- `LendDialog` behaves like `ContributeDialog`: no client-side hard cap, submit-then-consent-if-needed via `useReservationGate`.
- Zero schema changes.

**Non-Goals:**
- No auto-linking between `LOAN_REPAYMENT` and `GoalReservationPromise` resolution — confirmed independent lifecycles (see Decisions, D3). A user who wants the promise marked returned does so explicitly via the existing "return against promise" action, same as any other promise.
- Not changing `assertChronologicalBalanceNonNegative`'s behavior or its precedence over the shortfall check — still evaluated first, still a hard stop with no consent path.
- Not changing anything about how loan repayment, write-off, or due-date changes work today.

## Decisions

### D1: Reuse `enforceReservationGuard` as-is; relocate it to `goal-reservation-service.ts`
It's already fully generic — takes `(tx, userId, transactionId, accountId, amount, vatAmount, consent)` and knows nothing about which transaction type called it. `borrower-service.ts` calling into `transaction-service.ts` for this would be a backwards, unrelated-looking dependency (a borrower/loan concept reaching into the transactions module for a savings-goal concern). Moving it to sit alongside `computeShortfall`/`applyReservationConsent` in `goal-reservation-service.ts` — the module that actually owns this concern — lets both `transaction-service.ts` and `borrower-service.ts` import it as peers. Pure move, no behavior change; `transaction-service.ts` re-imports it from its new home.

### D2: `disburseLoan` calls the guard after `assertChronologicalBalanceNonNegative`, exactly where the old hard-cap check was
Same precedence rule the guard already enforces everywhere else (design.md D2 of the original `reserved-funds-guard` change): "can't afford it at all" stays a harder stop than "can afford it but it's reserved." The `LOAN_DISBURSEMENT` transaction row is created first (inside the `$transaction`), balance-checked, then guard-checked; if the guard throws `RESERVATION_CONSENT_REQUIRED`, the whole `$transaction` rolls back — no loan, no transaction row, exactly like today's rollback-on-hard-cap behavior, just with a different thrown code.

### D3: No auto-resolution between loan repayment and reservation promises
Confirmed with the user during exploration. Two independent ledgers stay independent:
- A `GoalReservationPromise` from a loan disbursement is scoped to `(savingsGoalId, accountId)`, exactly like any other promise — it has no `loanId` and never gains one.
- `LOAN_REPAYMENT` can credit any account (`borrowers` spec, "Record a Loan Repayment" — "not required to match the loan's `sourceAccountId`"), so there is no reliable account match to auto-resolve against even if this were desired.
- This matches the existing guard's own non-goal ("Not auto-detecting repayment from incoming transactions — repayment is always an explicit user action") — extending that same rule to loans instead of special-casing them keeps the mental model uniform: *every* promise, regardless of what caused it, is only ever resolved by an explicit return/write-off action.

### D4: `BorrowerActionState` gains `reservationRequired`, mirroring `InvestmentActionState`
`disburseLoanAction` follows `contributeAction`'s exact shape: parse `reservationConsent` from FormData via the existing `parseReservationConsent` helper (already generic in `investments/actions.ts` — relocate it next to `reservationConsentSchema` in `validation/goal-reservation.ts` so both `investments/actions.ts` and `borrowers/actions.ts` can import the same function instead of duplicating it), catch `RESERVATION_CONSENT_REQUIRED` and return `{ reservationRequired: error.details }` instead of `{ error }`.

### D5: `LendDialog` adopts `useReservationGate`, drops its client-side cap
`lend-dialog.tsx`'s `superRefine` (blocking submit when `amount > account.unallocated`) is removed entirely — `ContributeForm` has no equivalent and relies purely on the server round-trip. `LendForm`'s `useAppForm({ action: disburseLoanAction... })` becomes `useAppForm({ action: gatedAction })` from `useReservationGate(disburseLoanAction.bind(null, borrowerId))`, and the wizard renders conditionally exactly as in `ContributeForm`. The `LendAccountOption.unallocated` field and its display line ("X unallocated") stay — still useful information — but the drawer's description text ("Only an account's unallocated balance... can be lent out") is reworded to reflect that unallocated is now a soft guide, not a hard limit.

## Risks / Trade-offs

- **[Risk]** Relocating `enforceReservationGuard` touches `transaction-service.ts`, a file with no other changes in this proposal → **Mitigation**: pure cut-and-paste move plus an import-path update; no logic changes, covered by existing `transaction-service` tests continuing to pass unmodified.
- **[Trade-off]** A user can still end up with an open `GoalReservationPromise` from a loan that's already been fully repaid, with no automatic nudge to resolve it → **Mitigation**: accepted, per D3 — this is the same trade-off the guard already accepts for every other transaction type, and the dashboard banner already surfaces open promises indefinitely until resolved either way.
- **[Risk]** Removing the hard cap changes real user-facing behavior for anyone relying on "loans can never touch reserved savings" → **Mitigation**: this is the explicit, intended point of the change (proposal's **BREAKING** note); no migration of existing data is needed since no loan disbursement could previously exceed unallocated balance, so no historical `Loan` row is affected.

## Migration Plan

- Additive-only at the data layer (nothing to migrate — no new columns/tables).
- Single deploy: guard logic move + `disburseLoan` change + action/dialog wiring land together, since a partial rollout (e.g., backend accepts consent but UI still hard-blocks) would leave the feature unreachable.
- Rollback is a plain revert — no data written by the new path is incompatible with the old hard-cap code, since a `GoalReservationPromise`/`GoalAllocationEvent` created by a loan disbursement is structurally identical to one created by an expense today.

## Open Questions

- Whether the requirement text describing "loans can dip with consent" lives in `goal-reservation-guard/spec.md` (widening its existing outflow-type list) or `borrowers/spec.md` (replacing the removed hard-cap requirement) is a documentation-organization call with no behavioral impact — resolved in specs.md by widening `goal-reservation-guard`'s existing requirement and replacing `borrowers`' hard-cap requirement with a short cross-referencing one, per the exploration discussion.
