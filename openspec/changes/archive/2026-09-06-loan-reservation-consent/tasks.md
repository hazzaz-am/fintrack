## 1. Relocate the shared reservation guard helper

- [x] 1.1 Move `enforceReservationGuard` from `src/lib/services/transaction-service.ts` to `src/lib/services/goal-reservation-service.ts`, alongside `computeShortfall`/`applyReservationConsent`, with no behavior change.
- [x] 1.2 Update `transaction-service.ts` to import `enforceReservationGuard` from its new location instead of defining it, and confirm `recordExpense`, `recordTransfer`, and any investment contribution paths still call it identically.
- [x] 1.3 Relocate `parseReservationConsent` from `src/app/(app)/investments/actions.ts` to `src/lib/validation/goal-reservation.ts` (next to `reservationConsentSchema`), export it, and update `investments/actions.ts` to import it instead of defining it locally.

## 2. Wire the guard into loan disbursement

- [x] 2.1 In `src/lib/services/borrower-service.ts`, replace `disburseLoan`'s hard `amount > unallocated` throw (`LOAN_EXCEEDS_UNALLOCATED_BALANCE`) with a call to `enforceReservationGuard(tx, userId, transaction.id, input.accountId, input.amount, undefined, consent)`, placed after `assertChronologicalBalanceNonNegative` in the same position the old check occupied.
- [x] 2.2 Add an optional `consent?: ReservationConsentInput` parameter to `disburseLoan`, threaded through from the caller the same way `TransactionService.recordExpense`/`InvestmentService.contribute` accept it.
- [x] 2.3 Confirm the loan and its `LOAN_DISBURSEMENT` transaction are never persisted when the guard throws `RESERVATION_CONSENT_REQUIRED` — the existing `prisma.$transaction` rollback already guarantees this; write a test asserting no `Loan` row exists after a rejected-pending-consent attempt.

## 3. Server action

- [x] 3.1 Add `reservationRequired?: ReservationShortfall` to `BorrowerActionState` in `src/app/(app)/borrowers/actions.ts`, matching `InvestmentActionState`.
- [x] 3.2 In `disburseLoanAction`, parse `reservationConsent` from `formData` via the relocated `parseReservationConsent`, pass it to `BorrowerService.disburseLoan`, and catch `RESERVATION_CONSENT_REQUIRED` to return `{ reservationRequired: error.details as ReservationShortfall }` instead of `{ error }`.

## 4. UI

- [x] 4.1 In `src/app/(app)/borrowers/lend-dialog.tsx`, remove the `disburseLoanSchema.superRefine` block that hard-caps `amount` at `account.unallocated`.
- [x] 4.2 Replace `useAppForm({ action: disburseLoanAction.bind(null, borrowerId) })` with `useReservationGate(disburseLoanAction.bind(null, borrowerId))` → `useAppForm({ action: gatedAction })`, following `contribute-dialog.tsx`'s exact pattern.
- [x] 4.3 Render `<ReservationConsentWizard>` conditionally on `reservation`, passing `shortfall`, `currency` (derived from the selected account), `goals`, `pending`, `wizardError`, `onCancel={cancel}`, `onConfirm={(consent) => confirm(consent, onSuccess)}`.
- [x] 4.4 Update the `LendDialog` `DrawerDescription` copy to no longer claim disbursement is capped at the unallocated balance (e.g., describe that dipping into reserved savings now requires confirming which goal(s) it comes from).
- [x] 4.5 Keep the "`X` unallocated" helper text under the account selector — still accurate, informational context — but confirm it no longer implies a hard limit given the reworded drawer description.

## 5. Tests

- [x] 5.1 Update or remove any `borrower-service.test.ts` case asserting `LOAN_EXCEEDS_UNALLOCATED_BALANCE` is thrown for an over-unallocated disbursement; replace with a case asserting `RESERVATION_CONSENT_REQUIRED` is thrown instead, carrying the correct `shortfall`/`unallocated`/`goals` details.
- [x] 5.2 Add a test: disbursing with a valid `consent` payload that dips into one goal's reserve creates the loan, its `LOAN_DISBURSEMENT` transaction, a negative `GoalAllocationEvent` for that goal, and (when `returnBy` is set) an open `GoalReservationPromise`.
- [x] 5.3 Add a test: insufficient balance still rejects with `INSUFFICIENT_BALANCE` before the reservation guard is ever evaluated, even when the amount would also exceed the unallocated balance.
- [x] 5.4 Add a test: repaying a loan whose disbursement created an open `GoalReservationPromise` leaves that promise's `status`/`remainingAmount` completely unchanged.
- [x] 5.5 Add/confirm a test that deleting a `LOAN_DISBURSEMENT` transaction is still disallowed (per the existing "Loan Amount and Source Account Are Immutable" requirement) — this change doesn't touch that rule, but confirms `reverseForTransaction`'s delete-reversal path is never reachable for loans since loan transactions can't be deleted.

## 6. Spec sync

- [x] 6.1 Run `openspec-sync-specs` (or `/opsx:sync`) after implementation lands, to merge this change's delta specs (`goal-reservation-guard`, `borrowers`) into `openspec/specs/`.
- [x] 6.2 Archive the change once merged and verified, per the usual `/opsx:archive` flow.
