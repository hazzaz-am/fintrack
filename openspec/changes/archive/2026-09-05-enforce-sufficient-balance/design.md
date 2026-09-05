## Context

`Account` has no stored balance column — `AccountService.computeBalances`/`computeBalancesFor` (`src/lib/services/account-service.ts`) derive it on every read as a single aggregate: `openingBalance + income − expense (− VAT on expense) + transfers-in − transfers-out (− VAT on transfer-out) − investment contributions + investment returns`. No write path checks this figure before creating, editing, or deleting a transaction, so an account can be driven negative by an oversized expense, transfer, or investment contribution.

A precedent for this kind of check already exists: `SavingsGoalService.allocate` (`src/lib/services/savings-goal-service.ts`, ~lines 56-84) computes balance inside a `prisma.$transaction`, compares with `Decimal`, and throws an `AppError` (`ALLOCATION_EXCEEDS_BALANCE`, 409) if the amount exceeds what's available. This change follows the same shape but must go further: because `transactionDate` currently has no upper bound, a future-dated income could make a final-aggregate check pass even though the account is presently short. The check must therefore replay transactions in chronological order and confirm the running balance never goes negative at any step, not just at the end.

## Goals / Non-Goals

**Goals:**
- Guarantee no write can leave any account's chronologically-ordered running balance negative at any point in its transaction history, for `EXPENSE`, transfer-out, and `INVESTMENT_CONTRIBUTION` (create and edit), and for deleting an inflow transaction.
- Reuse the existing derived-balance architecture (no stored balance column, no schema migration) and the existing `AppError` convention for surfacing the rejection.
- Close the related gap that lets a future-dated transaction defeat any balance check, by bounding `transactionDate` (and investment date fields) to today-or-earlier.

**Non-Goals:**
- No per-account-type override (e.g. credit/overdraft accounts allowed to go negative) — out of scope, no such account type exists in the schema today.
- No audit, backfill, or migration of pre-existing historical data that may already violate this rule — the check applies only to new writes going forward.
- No stored/cached running-balance column or per-row cached balance — the chronological walk is computed on demand, consistent with how balance has always been derived.
- No change to how transfers, income, or investment returns are modeled (still a single `Transaction` row per transfer; still no balance check needed for inflow-increasing operations).

## Decisions

**1. Chronological replay, not a final-aggregate check.**
A single "does the final total stay ≥ 0" check can be defeated by a future-dated income masking a present-day shortfall (e.g. ৳5,000 today, a ৳10,000 income dated next week, and a ৳12,000 expense dated today — final total is positive, but the account is functionally at −৳7,000 until the future income arrives). Restricting `transactionDate` to today-or-earlier (Decision 4) removes *future*-dating as a source of this problem, but backdating into the past remains unrestricted and can still reorder the sequence relative to existing rows. The check therefore always replays `openingBalance` forward through every transaction affecting the account, ordered by `(transactionDate, createdAt, id)`, and rejects if the running total would go negative at any step — not only at the end. This is more expensive than a single `SUM`, but consistent with the app's existing philosophy of deriving balance on demand rather than caching it, and the per-account transaction volume for a personal finance tracker is small enough that an O(n) replay per write is not a performance concern.

**2. Same-day ordering: `(transactionDate, createdAt, id)`.**
Multiple transactions can share a `transactionDate`. Ordering by `createdAt` then `id` makes the walk deterministic (whichever was actually entered first is treated as happening first), without introducing a new field.

**3. New shared helper on `AccountService`, not duplicated per call site.**
A new function (e.g. `AccountService.assertChronologicalBalanceNonNegative(tx, userId, accountId)`) performs the replay for one account and throws `AppError("INSUFFICIENT_BALANCE", ...)` (409, added to `src/lib/errors.ts` alongside `ALLOCATION_EXCEEDS_BALANCE`, `INVALID_TRANSFER`, etc.) if any step is negative. It is called, inside the same `prisma.$transaction` as the write, from:
- `TransactionService.recordIncomeOrExpense` — only for the `EXPENSE` direction (not `INCOME`, which is safe by construction); the shared helper takes a direction flag so `recordIncome` does not pay for a check it can never need.
- `TransactionService.recordTransfer` — only against `sourceAccountId`.
- `TransactionService.update` — re-run whenever the edit could plausibly decrease the running balance at some point in the sequence (amount increase, date change, or a change of direction/account); always safe to re-run unconditionally on edit given the low transaction volume, so the implementation should default to "always re-check on update" rather than trying to precisely classify which edits are risk-free.
- `TransactionService.delete` — only when deleting an inflow transaction (`INCOME`, transfer-in side, `INVESTMENT_RETURN`).
- `InvestmentService.contribute` and `InvestmentService.createWithInitialContribution` — against the contributing account.

Each check reads the candidate transaction's own new state (post-edit amount/date, or post-delete absence) as part of the same DB transaction, so the write and the validation observe a single consistent snapshot and there is no read-then-write race between two concurrent requests against the same account.

**4. Bound `transactionDate` (and investment date fields) to today-or-earlier.**
Added at the zod layer (`transaction.ts`, `investment.ts`) via a shared date-bound helper, and mirrored as a `max` attribute on the date `<input>` elements in the relevant dialogs. This is enforced independently of the balance check (it is a correctness fix in its own right — a finance tracker recording future transactions as if they already happened is questionable regardless of balance), and it simplifies the mental model for the chronological check by removing "not-yet-happened" income from the sequence.

**5. `vatAmount` counted as part of the outflow.**
For `EXPENSE` and transfer-out, the amount checked against available balance is `amount + vatAmount`, matching the existing subtraction of VAT in `computeBalances`. An expense with no `vatAmount` is unaffected.

**6. No audit of pre-existing data.**
The check applies only going forward. If an existing account's history already contains a chronological dip (possible, since backdating has always been unrestricted), that dip is left alone; only a future edit/delete that itself would worsen or newly trigger a violation is rejected. No migration script is added.

## Risks / Trade-offs

- **[Risk]** A user with a large existing transaction history that already dips negative somewhere in the past may find an unrelated edit near that spot unexpectedly rejected once this ships. → **Mitigation**: none by design (Decision 6) — accepted as a low-stakes trade-off given the absence of an audit step; the `INSUFFICIENT_BALANCE` error message should state the violating date so the user can understand why an edit was rejected.
- **[Risk]** Replaying the full transaction history on every qualifying write is O(n) per account instead of O(1). → **Mitigation**: acceptable for expected personal-finance-tracker volumes (hundreds to low thousands of rows per account); revisit only if a real performance problem is observed.
- **[Risk]** Restricting `transactionDate` to today-or-earlier is a breaking change for any existing future-dated data or workflow that relied on scheduling ahead. → **Mitigation**: no such UI/workflow currently exists (confirmed: no balance-over-time or scheduling feature reads future-dated transactions today), so the practical impact is limited to rejecting new future-dated submissions.
- **[Trade-off]** `TransactionService.update` re-runs the chronological check unconditionally rather than precisely detecting which edits are risk-free, trading a small amount of unnecessary work for simpler, harder-to-get-wrong logic.

## Migration Plan

No schema migration. Deploy as a single release:
1. Add `INSUFFICIENT_BALANCE` error code.
2. Add the chronological replay helper on `AccountService`.
3. Wire the helper into the call sites listed in Decision 3.
4. Add the today-or-earlier date bound to validation and UI.
No rollback data concerns since no data is migrated; reverting is a plain code revert.

## Open Questions

None outstanding — all scoping decisions were resolved during exploration prior to this proposal.
