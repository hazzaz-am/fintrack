## Context

This codebase already has two precedents for "money that leaves an account toward something other than an ordinary expense, tracked until it comes back or is resolved":

- **`investments`**: an `Investment` entity funded by one or more `INVESTMENT_CONTRIBUTION` transactions (derived principal = opening + contributions − returns), closed out by `INVESTMENT_RETURN` transaction(s) crediting a chosen account, with derived overdue-maturity reporting (`daysUntilMaturity`).
- **`goal-reservation-guard`**: a consent-gated dip into a savings goal's *already-allocated* reserve, tracked as a `GoalReservationPromise` (stored status including `WRITTEN_OFF`, but `OVERDUE` derived at read time from `dueDate`), resolved via partial/full "return" (positive `GoalAllocationEvent`) or explicit write-off.

Lending money to a person is closer in shape to the first (a discrete principal-out event against a named entity, repaid over time, no accumulating "reserve") than the second (which is about protecting money already earmarked inside the user's own accounts). This design deliberately borrows the `Investment` shape for the entity/ledger structure, and borrows only the *status/write-off* vocabulary from `GoalReservationPromise` — it does not touch or extend `goal-reservation-guard` itself.

## Goals / Non-Goals

**Goals:**
- Let a user record money lent to a person, capped strictly by the source account's unallocated balance (never allowed to dip into goal-reserved funds, with no consent override for this transaction type).
- Support partial repayments over time, to any account the user chooses at the time of each repayment.
- Guarantee a loan can only close two ways — fully repaid, or explicitly written off — never silently deleted or resized.
- Surface an overdue signal that clears itself the instant a loan is repaid or written off, with no manual dismissal step.

**Non-Goals:**
- No interest/profit modeling — a loan is principal-only, unlike `Investment`'s optional profit-on-maturity. A user who wants to track interest can record it as a separate ordinary `INCOME` transaction, same escape hatch `investments` already uses for profit.
- Not extending `goal-reservation-guard`'s consent-flow requirement list to include the new `LOAN_DISBURSEMENT` type — the new unallocated-balance hard cap (below) already fully subsumes that protection for loans, at a strictly stricter level, so adding it there too would be redundant and would reintroduce a consent-to-dip path this change deliberately excludes for lending.
- Not modeling any notion of a Borrower "account" or credit limit beyond the sum of their individual loans' outstanding amounts.
- Not auto-detecting repayment from an unrelated incoming transaction — recording a repayment is always an explicit user action, same convention as `GoalReservationPromise` returns.

## Decisions

### D1: Borrower (profile) + Loan (thin record, no stored money fields) — two models, mirroring Investment exactly, not SavingsGoal/GoalAllocationEvent
A loan is a discrete principal-out event with its own `dueDate` and its own immutability rules — it doesn't behave like an accumulating reserve (`SavingsGoal`) that many independent events flow in and out of. `Borrower` is the reusable entity (like `Investment`); `Loan` holds only `borrowerId`, `dueDate`, and `status` — no `amount`, no `sourceAccountId`. Both are read off the single `LOAN_DISBURSEMENT` `Transaction` linked via `Transaction.loanId` (there is always exactly one, created atomically with the loan), the same way `Investment` stores no funding account and derives its principal from linked `Transaction` rows. Repayments are plain `LOAN_REPAYMENT` `Transaction` rows carrying the same `loanId` — there is no separate `LoanRepayment` ledger table, exactly mirroring `INVESTMENT_RETURN` (which also has no companion model and already proves partial-withdrawal aggregation works this way). `GoalAllocationEvent` is not the right precedent here: its separate-table existence is driven by a need this doesn't share — a ledger shared across many goals and accounts simultaneously — whereas a loan's money movements belong to exactly one `Loan` and are fully captured by `Transaction.loanId` + `Transaction.type`.

### D2: Unallocated-balance hard cap, checked once at Loan creation, independent of goal-reservation-guard
`Loan.amount` must not exceed `sourceAccount.computedBalance − sum(GoalAllocationEvent for sourceAccount)` — the same unallocated-balance computation `goal-reservation-guard` already derives — but here it's a flat rejection with no consent override, and it lives entirely inside the new `borrowers` capability rather than modifying `goal-reservation-guard`. Considered reusing the CONCENT consent wizard for consistency, but rejected: the user explicitly wants lending capped hard against reserved funds with no exception, which is a different (stricter) policy than "allowed with consent" — conflating the two would mean either weakening the loan cap or unexpectedly changing the existing consent flow's behavior for other transaction types.

### D3: Order of checks — chronological insufficient-balance first, then the unallocated-balance cap
A `LOAN_DISBURSEMENT` is an outflow like `EXPENSE`/`INVESTMENT_CONTRIBUTION`, so it first goes through the existing chronological running-balance check (`INSUFFICIENT_BALANCE`); only if that passes does the new unallocated-balance cap run. Same "can't afford it at all is a harder stop than it's reserved" ordering `goal-reservation-guard` already established (its D2), applied here as a hard reject instead of a consent gate.

### D4: One `LOAN_DISBURSEMENT` transaction per Loan, immutable after creation — carve-out on `transactions`' Edit/Delete requirement
The single `LOAN_DISBURSEMENT` transaction's `accountId` and `amount` — which together stand in for what would otherwise be `Loan.sourceAccountId`/`Loan.amount` — are set once, atomically with the `Loan` it belongs to, and neither the transaction's amount nor the transaction itself can ever be edited or deleted afterward. This is a deliberate, narrow carve-out on the existing "Edit and Delete Transactions" requirement (which today allows deleting any outflow transaction, including `INVESTMENT_CONTRIBUTION`, freely) — because unlike an investment contribution, a `Loan`'s entire identity (what was promised, by whom, due when) depends on that fixed amount; allowing it to change or disappear would break the "the borrower must return it" guarantee this feature exists to enforce. The *only* mutable field on an existing `Loan` record itself is `dueDate`.

### D5: Repayments can credit any account, chosen fresh per repayment
A `LOAN_REPAYMENT` transaction's `accountId` (the account it credits) is chosen at the time of each repayment and need not match the originating `LOAN_DISBURSEMENT`'s `accountId` — mirrors `INVESTMENT_RETURN`'s "credit a chosen account" behavior, since in practice a friend might repay in cash deposited to a different account than the one you originally paid them from.

### D6: `LoanStatus` is a stored field (not purely derived), but `OVERDUE` is a derived read-time overlay, not a stored value
`OPEN` / `PARTIALLY_REPAID` / `REPAID` transition automatically from the repayment ledger (`outstanding = disbursed amount − Σ LOAN_REPAYMENT transaction amounts for this loanId`), but `WRITTEN_OFF` cannot be derived from amounts alone (a written-off loan with `outstanding > 0` looks identical on paper to one that's merely still open) — so `status` is stored, mirroring `GoalReservationPromiseStatus`'s convention exactly. `OVERDUE` is deliberately never one of the stored enum values: it's computed at read time as `dueDate < now AND outstanding > 0 AND status != WRITTEN_OFF`, mirroring both `GoalReservationPromise`'s derived-overdue convention and `Investment`'s `daysUntilMaturity` convention, and disappears immediately (no stale flag to clear) the instant a repayment brings `outstanding` to zero or a write-off is recorded.

### D7: No Borrower delete — archive-free, edit-only profile
Unlike `Account`/`SavingsGoal` (which support archiving) `Borrower` has no delete or archive action in this change: since a `Borrower` can have loan history spanning years, and there's no requirement driving a "hide this borrower" need yet, the profile only supports editing its name/notes. This can be revisited if usage shows a real need (e.g. a "no longer relevant" filter), without a schema change (a status column can be added additively later).

### D8: LOAN_DISBURSEMENT / LOAN_REPAYMENT excluded from income/expense totals
Same convention as `INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN`: lending money out isn't spending it, and getting it back isn't earning it. Both new transaction types carry `accountId` + a new `loanId` (mirroring `investmentId`), no `categoryId`, no `sourceAccountId`/`destinationAccountId`.

## Risks / Trade-offs

- **[Risk]** Concurrent loan creation/repayment could race against the same unallocated-balance computation `savings-goals`/`goal-reservation-guard` already contend with → **Mitigation**: reuse the existing `prisma.$transaction` pattern, computing balance and unallocated amount inside the transaction, consistent with existing code.
- **[Trade-off]** No interest modeling means a lender who charges interest has to record it as an awkward separate `INCOME` transaction with no link back to the loan → **Mitigation**: accepted for v1, matches the user's own stated scope (principal-out/principal-back only); flagged as a possible future extension, not silently unsupported.
- **[Trade-off]** No Borrower archive/delete means a long-inactive contact stays in the list forever → **Mitigation**: accepted (D7); the aggregate-outstanding view naturally deprioritizes fully-settled borrowers with nothing outstanding, and a future change can add archiving additively.
- **[Risk]** A user could still effectively "hide" an unwanted written-off loan by writing it off immediately after disbursing, defeating the spirit of the immutability guarantee → **Mitigation**: out of scope, same posture `goal-reservation-guard`'s design took toward its analogous gaming risk — this feature's purpose is visibility and an explicit resolution trail, not preventing every possible way a user could misuse their own tracking tool.

## Migration Plan

- Additive only: new `Borrower` and `Loan` Prisma models (no separate repayment-ledger table — see D1); two new `TransactionType` enum values (`LOAN_DISBURSEMENT`, `LOAN_REPAYMENT`); a new `LoanStatus` enum; a new nullable `loanId` column on `Transaction`. Standard Prisma migration, no existing column changes.
- No backfill needed — no loan history exists prior to this change.
- Single deploy, no feature flag: existing accounts/transactions/goals behavior is byte-for-byte unchanged for anyone who never creates a Borrower.

## Open Questions

- Exact `Borrower` profile fields beyond `name` + optional `notes` (e.g. phone, relationship tag) are left to `tasks.md`/implementation — default to name + optional notes only for v1 unless the user specifies more before implementation starts.
- Whether the Borrowers screen needs its own dashboard-level overdue widget (like `goal-reservation-guard`'s dashboard banner) or whether the overdue treatment on the Borrowers screen itself (mirroring `investments-ui`'s overdue-maturity card treatment) is sufficient, is left open — this change scopes overdue visibility to the Borrowers screen only; a dashboard widget can be added additively later if the user wants more prominent nagging.
