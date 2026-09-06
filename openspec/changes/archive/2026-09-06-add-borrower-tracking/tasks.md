## 1. Data Model

- [x] 1.1 Add `Borrower` Prisma model: `id`, `userId`, `name`, `notes?`, `createdAt`, `updatedAt`.
- [x] 1.2 Add `LoanStatus` enum (`OPEN` | `PARTIALLY_REPAID` | `REPAID` | `WRITTEN_OFF` — `OVERDUE` is derived at read time, not stored, matching `GoalReservationPromise`'s convention).
- [x] 1.3 Add `Loan` Prisma model: `id`, `userId`, `borrowerId`, `dueDate`, `status` (default `OPEN`), `createdAt`, `updatedAt` — no `amount`/`sourceAccountId` columns; both are read off the single linked `LOAN_DISBURSEMENT` `Transaction` (design.md D1 revision, mirroring `Investment`'s no-stored-funding-account convention).
- [x] 1.4 Add `LOAN_DISBURSEMENT` and `LOAN_REPAYMENT` to `TransactionType`; add `loanId` (nullable) to `Transaction`, mirroring the existing `investmentId` field/relation — this one field carries both the disbursement and every repayment for a loan (no separate `LoanRepayment` table; repayments aggregate the same way `INVESTMENT_RETURN` does).
- [x] 1.5 Add a CHECK constraint via migration (mirroring the existing investment-row constraint) so `LOAN_DISBURSEMENT`/`LOAN_REPAYMENT` rows require `accountId` + `loanId` and forbid `categoryId`/`sourceAccountId`/`destinationAccountId`.
- [x] 1.6 Generate and review the Prisma migration; confirm no existing table/enum/column changes type or meaning.

## 2. Loan Disbursement (Server)

- [x] 2.1 Add `BorrowerService` (`src/lib/services/borrower-service.ts`) with `create`, `update` (name/notes only, no delete), `listWithOutstanding` (aggregate outstanding per borrower via DB aggregation, per the `Borrower Aggregate Outstanding` requirement).
- [x] 2.2 Add `BorrowerService.disburseLoan(userId, borrowerId, accountId, amount, disbursedDate, dueDate)`: reuse `assertChronologicalBalanceNonNegative` (or the equivalent check `transaction-service.ts` already uses for `EXPENSE`/`INVESTMENT_CONTRIBUTION`) first; only if that passes, reuse `sumAllocationsForAccount` from `savings-goal-service.ts` to compute unallocated balance and hard-reject (no consent path) if `amount` exceeds it.
- [x] 2.3 Reject `disbursedDate` later than today (Transaction Date Bound) at the validation-schema layer (`disburseLoanSchema`'s `zPastOrPresentDate`), same convention as every other transaction-creating schema; `dueDate` uses a plain `z.coerce.date()` with no such restriction.
- [x] 2.4 On success, within one `prisma.$transaction`: create the `Loan` (status `OPEN`) and its single `LOAN_DISBURSEMENT` transaction atomically.
- [x] 2.5 Confirm the existing `transactions` insufficient-balance/date-bound test suites are unaffected by the new transaction type (new CHECK constraint doesn't change existing row shapes). Also updated `account-service.ts`'s `effectOn`/`computeBalances` (not originally called out as its own task) to include the two new transaction types in the balance formula, per the `accounts` delta spec.

## 3. Loan Repayment & Write-off (Server)

- [x] 3.1 Add `BorrowerService.recordRepayment(userId, loanId, accountId, amount, transactionDate)`: validate `amount ≤ outstanding` (derived as the disbursed amount minus the sum of existing `LOAN_REPAYMENT` transactions for this `loanId`), reject `transactionDate` later than today, create a `LOAN_REPAYMENT` transaction crediting `accountId`, and update `Loan.status` to `PARTIALLY_REPAID` or `REPAID` based on the resulting outstanding amount.
- [x] 3.2 Add `BorrowerService.writeOffLoan(userId, loanId)`: sets `status = WRITTEN_OFF` regardless of remaining outstanding, creates no transaction, rejects if the loan is already `REPAID` or `WRITTEN_OFF`.
- [x] 3.3 Add `BorrowerService.updateDueDate(userId, loanId, dueDate)`: the only mutation allowed on an existing loan besides repayment/write-off; no amount or source-account edit path exists anywhere in the service.
- [x] 3.4 Add a read path computing `outstanding` and effective overdue state (`dueDate < now AND outstanding > 0 AND status != WRITTEN_OFF`) at query time, consistent with this codebase's derived-state conventions (`getProgress` achieved-state, `GoalReservationPromise` overdue, `Investment.daysUntilMaturity`).
- [x] 3.5 Confirm `TransactionService.update`/`delete` reject any attempt to edit the `amount` of, or delete, a `LOAN_DISBURSEMENT` transaction — add the carve-out alongside the existing per-type rules in that service.

## 4. Borrowers Screen (Client)

- [x] 4.1 Add `/borrowers` route (`src/app/(app)/borrowers/page.tsx`) listing borrowers via `BorrowerService.listWithOutstanding`, each showing aggregate outstanding and an expandable loan history, with the empty state per the `borrowers-ui` spec.
- [x] 4.2 Add "Add borrower" dialog (name + optional notes), TanStack Form, same client/server shared-schema validation convention as `investments-ui`.
- [x] 4.3 Add "Lend" dialog (source account, amount, due date): client-side guard against exceeding the source account's known unallocated balance (fetched the same way the existing over-allocation warning is computed), in addition to the authoritative server check.
- [x] 4.4 Add "Repay" dialog (destination account, amount pre-filled with current outstanding): client-side guard against exceeding outstanding, available only on `OPEN`/`PARTIALLY_REPAID` loans.
- [x] 4.5 Add "Write off" action with an explicit confirmation step, available only on `OPEN`/`PARTIALLY_REPAID` loans.
- [x] 4.6 Add "Change due date" action, available on any loan regardless of status; confirm no amount-edit or delete action is exposed anywhere in the loan's action menu.
- [x] 4.7 Add overdue visual treatment on loan entries, mirroring `investment-card.tsx`'s overdue-maturity styling.
- [x] 4.8 Enable the "Borrowers" sidebar entry (`web-app-shell`) linking to `/borrowers`.
- [x] 4.9 Verify the Borrowers screen and all its dialogs at 375px width (single-column, no clipped figures), matching `investments-ui`'s phone-width requirement. Verified live: empty state, populated card, expanded loan history, and the Lend drawer all render single-column with no clipping at 375px.

## 5. Verification

- [x] 5.1 Unit tests for the unallocated-balance hard cap on loan disbursement (within limit, exceeding limit, insufficient-balance-takes-precedence, VAT is not applicable here since loans carry no `vatAmount`).
- [x] 5.2 Unit tests for partial repayment, full repayment (status → `REPAID`), repayment exceeding outstanding (rejected), and write-off (including write-off after partial repayment).
- [x] 5.3 Unit tests for loan immutability: attempting to delete or amount-edit a `LOAN_DISBURSEMENT` transaction is rejected in all loan statuses.
- [x] 5.4 Unit tests for overdue derivation (past due with balance, clears on full repayment, clears on write-off, due-date change clears/re-triggers overdue correctly).
- [x] 5.5 Unit tests confirming `LOAN_DISBURSEMENT`/`LOAN_REPAYMENT` are excluded from income/expense totals and correctly included in the account balance formula.
- [x] 5.6 Confirm existing `accounts`, `transactions`, `savings-goals`, and `goal-reservation-guard` test suites still pass unchanged. Full suite: 153/153 passing (133 pre-existing + 20 new).
- [x] 5.7 Manual/browser QA: create a borrower, lend against a partially-goal-allocated account (confirm the hard cap blocks over-the-unallocated-limit lending with no consent prompt), record a partial repayment to a different account than the disbursing one, confirm the overdue treatment appears/clears correctly, and write off a loan. Verified live end-to-end via `/browse` against the dev server: registered a user, created BRAC Bank (৳50,000), allocated ৳40,000 to a savings goal, added borrower Rafi, confirmed a ৳15,000 lend attempt was blocked client-side with no consent flow ("Only BDT 10,000.00 is unallocated..."), lent ৳8,000, partially repaid ৳3,000 to the same account, changed the due date to clear an overdue state, fully repaid the remainder (status → Repaid, no actions left), created and wrote off a second loan, and confirmed account balances tracked every step correctly (50,000 → 42,000 → 45,000 → 50,000 → 49,000). Found and fixed two real bugs during this pass:
  1. The Lend dialog defaulted `dueDate` to today, which made every new loan read as overdue the instant it was created (`isOverdue` fires once `dueDate` has passed). Fixed by defaulting to 14 days out (`lend-dialog.tsx`).
  2. `listWithOutstanding`'s aggregate query summed every loan regardless of status, so a written-off loan's amount kept inflating the borrower's top-level "Outstanding" total even though it's explicitly no longer expected back. Fixed by excluding `WRITTEN_OFF` loans from the aggregate (`borrower-service.ts`), with a regression test (`tests/borrower-service.test.ts`) verified RED before the fix and GREEN after.
