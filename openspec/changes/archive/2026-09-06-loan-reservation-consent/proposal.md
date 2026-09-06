## Why

Loan disbursement currently hard-rejects any amount that would dip into an account's goal-reserved balance, with no override path — a deliberate choice made when `goal-reservation-guard` shipped (`borrower-service.ts`'s disbursement comment calls this out explicitly: "no consent override, unlike goal-reservation-guard's dip-with-consent flow for other transaction types"). That's now the wrong default: a user should be able to lend from money a savings goal has reserved, the same way they can already spend, invest, or transfer into it, as long as they explicitly consent through the same CONCENT wizard. This closes the one outflow type the reservation guard doesn't yet cover, rather than inventing a second consent mechanism.

## What Changes

- `LOAN_DISBURSEMENT` becomes a fourth outflow type evaluated by the existing reserved-funds shortfall check (alongside `EXPENSE`, `INVESTMENT_CONTRIBUTION`, and outgoing `TRANSFER`), checked in the same position: after the account's insufficient-balance check, before the loan is created.
- **BREAKING**: Removes the hard, non-overridable `LOAN_EXCEEDS_UNALLOCATED_BALANCE` rejection. A disbursement that dips into reserved funds is no longer auto-rejected — it now requires the user to complete the same two-step CONCENT consent wizard (`ReservationConsentWizard`) already used for expenses/investments/transfers, selecting which goal(s) absorb the shortfall and whether each is a permanent reduction or a promised return by a date.
- `LendDialog`'s client-side hard cap (the `superRefine` blocking `amount > unallocated`) is removed; the form instead wires through `useReservationGate`, matching `ContributeDialog`'s existing pattern, and its drawer copy is updated to no longer claim disbursement is capped at the unallocated balance.
- Loan repayment and reservation-promise return remain fully independent lifecycles — repaying a loan never auto-resolves a `GoalReservationPromise` created by its disbursement, even when the repayment credits the same account. The user resolves each explicitly, consistent with the guard's existing non-goal of never auto-detecting repayment from incoming transactions.
- No schema changes: `GoalReservationPromise` and `GoalAllocationEvent` already support an arbitrary `sourceTransactionId`, so a `LOAN_DISBURSEMENT` transaction links in exactly like an `EXPENSE` does today.

## Capabilities

### New Capabilities
(none — this reuses the existing `goal-reservation-guard` mechanism rather than introducing a new one)

### Modified Capabilities
- `goal-reservation-guard`: The shortfall-detection requirement's covered outflow types grow from three (`EXPENSE`, `INVESTMENT_CONTRIBUTION`, outgoing `TRANSFER`) to four, adding `LOAN_DISBURSEMENT`. The consent wizard, ledger-effect, promise-lifecycle, and delete-reversal requirements apply to loan disbursements unchanged — no new requirement text needed there beyond widening the outflow-type list.
- `borrowers`: The "Loan Disbursement Cannot Exceed the Source Account's Unallocated Balance" requirement (hard cap, no consent path) is replaced by a requirement describing the consent-gated dip, cross-referencing `goal-reservation-guard`. The "Insufficient balance takes precedence over the unallocated-balance cap" scenario is reworded to precede the *shortfall check* rather than a cap, but keeps the same precedence behavior.

## Impact

- `src/lib/services/borrower-service.ts`: `disburseLoan` gains a call to the existing `enforceReservationGuard` helper (mirroring `InvestmentService`'s contribution path), replacing its current hard-cap throw. No signature changes needed to `computeShortfall`/`applyReservationConsent` in `goal-reservation-service.ts` — both are already transaction-type-agnostic.
- `enforceReservationGuard` itself (currently defined in `transaction-service.ts`) relocates to `goal-reservation-service.ts` so a fourth, unrelated service doesn't reach into `transaction-service.ts` for shared guard logic (implementation detail for design.md).
- `src/app/(app)/borrowers/actions.ts` and `lend-dialog.tsx`: server action returns `reservationRequired` the same shape investments/transactions already do; dialog adopts `useReservationGate` + `ReservationConsentWizard`.
- `openspec/specs/goal-reservation-guard/spec.md` and `openspec/specs/borrowers/spec.md`: requirement text updated per above.
- No database migration required.
