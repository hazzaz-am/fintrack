## Why

Today there is no way to track money lent out to people outside the household's own accounts. A user who hands ৳5,000 to a friend has no record of it beyond memory, no way to see how much of an account's balance is actually "free" once money already earmarked for savings goals is excluded, and no nudge to follow up when the person doesn't pay back on time. This change adds that tracking: a reusable Borrower profile, a Loan record per lend-event that can only be funded from an account's genuinely unallocated balance, partial or full repayments into any account of the user's choosing, and a due-date-driven overdue signal that clears the moment a loan is repaid or explicitly written off.

## What Changes

- New `Borrower` entity (name + optional notes) a user can create once and reuse across many loans over time, with an aggregate view of total outstanding across all their loans — mirrors how `Investment` already supports multiple contributions from one entity.
- New `Loan` record per lend-event: fixed `amount` and `sourceAccountId` at creation (never editable afterward), a `dueDate` (the *only* field ever editable on an existing loan), and a status derived from repayments (`OPEN` → `PARTIALLY_REPAID` → `REPAID`, or `WRITTEN_OFF`).
- New hard cap on lending: a loan's `amount` cannot exceed the source account's **unallocated** balance (computed balance minus that account's `GoalAllocationEvent` sum, the same computation `goal-reservation-guard` already uses) — rejected outright with no consent path, unlike the existing reservation guard's dip-with-consent flow for expenses/investment contributions/transfers. This is deliberately a separate, stricter rule scoped only to loans.
- New `LoanRepayment` records: any number of partial (or one full) repayments against a loan, each crediting an account of the user's choosing at the time of entry (not necessarily the account the loan was disbursed from) — mirrors `INVESTMENT_RETURN`'s "return to a chosen account" and its support for partial withdrawal.
- New `WRITTEN_OFF` action: closes a loan regardless of remaining outstanding amount, with no further repayment expected — mirrors `GoalReservationPromise`'s write-off. Combined with the "no cancel, no amount edit" rule above, a loan can only ever close two ways: fully repaid, or explicitly written off.
- New `LOAN_DISBURSEMENT` / `LOAN_REPAYMENT` transaction types, excluded from income/expense totals (like `INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN`), with `LOAN_DISBURSEMENT` carrying a new immutability carve-out: it can never be deleted or amount-edited once created, unlike every other outflow transaction type today.
- New Borrowers screen: list of borrowers with aggregate outstanding, per-borrower loan history, lend/repay/write-off/change-due-date actions, and an overdue visual treatment on any loan past its `dueDate` with `outstanding > 0` — mirrors the Investments screen's overdue-maturity treatment.
- **BREAKING**: none — fully additive. No existing transaction type, account balance formula input, or goal-allocation behavior changes for accounts/transactions that never touch a loan.

## Capabilities

### New Capabilities
- `borrowers`: Borrower CRUD; Loan creation with the unallocated-balance hard cap; partial/full `LoanRepayment` recording to any chosen account; write-off; due-date-only edit; derived `outstanding` and status; overdue reporting (mirrors `investments`' upcoming/overdue maturity shape).
- `borrowers-ui`: the Borrowers screen — borrower list with aggregate outstanding, borrower detail/loan history, lend/repay/write-off/change-due-date dialogs, overdue visual treatment, phone-width usability (mirrors `investments-ui`'s conventions).

### Modified Capabilities
- `transactions`: adds `LOAN_DISBURSEMENT` and `LOAN_REPAYMENT` transaction types (carrying `accountId` + `loanId`, no `categoryId`/source/destination, excluded from income/expense totals — same shape as the existing investment-transaction requirements) and a new carve-out on the existing "Edit and Delete Transactions" requirement: a `LOAN_DISBURSEMENT` transaction can never be deleted and its `amount` can never be edited, unlike other outflow transaction types. The existing "Transaction Date Bound" requirement extends to loan disbursement and repayment dates.
- `accounts`: extends the "Derived Account Balance" requirement's formula with two new terms — minus loan disbursements, plus loan repayments — alongside the existing investment terms.
- `web-app-shell`: adds a "Borrowers" entry to the sidebar navigation (not currently part of PRD §27's module list), enabled and linking to `/borrowers`.

## Impact

- **Services**: new `BorrowerService` (or a `loan-service.ts`) for Borrower/Loan/LoanRepayment CRUD and the unallocated-balance check; reuses the existing unallocated-balance helper the `goal-reservation-guard` capability already computes (`computedBalance − sum(GoalAllocationEvent for account)`) rather than re-deriving it.
- **Data model**: new `Borrower`, `Loan`, `LoanRepayment` Prisma models; two new `TransactionType` enum values; a new `LoanStatus` enum (`OPEN` | `PARTIALLY_REPAID` | `REPAID` | `WRITTEN_OFF`).
- **API/UI**: new `/borrowers` route and screen, new lend/repay/write-off/change-due-date forms (built with TanStack Form, per this codebase's now-universal form convention), new sidebar entry.
- **Existing behavior unaffected**: `savings-goals`, `goal-reservation-guard`, and all existing `transactions`/`accounts` requirements for non-loan transaction types are unchanged.
