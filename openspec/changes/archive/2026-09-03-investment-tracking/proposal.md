## Why

The core financial architecture (accounts, transactions, categories, savings goals) is built and tested, but it currently can't represent investments at all (PRD §16-20) — and more importantly, without a designed money-movement mechanism, buying an investment would either silently leave funds double-counted in both an account's balance and the investment's principal, or require bolting on an ad-hoc adjustment. This change designs and adds investment tracking as a first-class ledger participant, extending the same "derive everything from an append-only ledger" pattern already established for account balances and goal allocations, rather than introducing a parallel, inconsistent bookkeeping mechanism.

## What Changes

- Add `Investment` records (name, type, institution, dates, expected return, status, notes) per PRD §17.
- Add two new `Transaction` types, **`INVESTMENT_CONTRIBUTION`** and **`INVESTMENT_RETURN`**, each carrying `accountId` + a new `investmentId` (mirroring how `TRANSFER` carries two account IDs). Both are excluded from income/expense totals, same as `TRANSFER` — money moving into or out of an investment is neither income nor an expense, it's movement between two of the user's own asset containers.
- **MODIFIED**: `Account`'s derived-balance formula gains two more terms: `− SUM(INVESTMENT_CONTRIBUTION) + SUM(INVESTMENT_RETURN)`, so buying an investment reduces the funding account's balance and a payout increases it — preventing the double-counting that would otherwise occur in `Total Available Balance` and future Net Worth calculations.
- `Investment.principalAmount` (net principal currently committed) is **derived**, not stored — `SUM(INVESTMENT_CONTRIBUTION) − SUM(INVESTMENT_RETURN)` for that investment — the same pattern as `Account` balance and `GoalAllocationEvent` totals. This also means recurring contributions (e.g. DPS) and partial withdrawals are just more ledger rows, not special-cased operations.
- Investment profit on maturity is recorded as an ordinary `INCOME` transaction under category "Investment Return" (PRD §20); only the principal portion of a payout uses `INVESTMENT_RETURN`. This keeps Rule 4 (§29 — principal is not investment income) a structural consequence rather than a rule every code path must remember.
- Add investment status lifecycle (`Planned`, `Active`, `Matured`, `Withdrawn`, `Cancelled`) as user-asserted transitions, not automatic on `maturityDate`; a past-`maturityDate`-but-still-`Active` investment surfaces as a distinct "overdue" state via a computed `daysUntilMaturity` rather than an automatic status flip.
- Add `Investment.openingPrincipal` (mirroring `Account.openingBalance`) for pre-existing/untracked investments (e.g. real estate already owned) recorded without ledger history. **No `accountId` field on `Investment`** — funding accounts are recorded per-contribution on the `Transaction` rows instead, so one investment can be funded from multiple accounts over time (same multi-source need already established for savings goals, §9).
- Add upcoming-maturity and totals queries (Total Invested, Current Estimated Value, Expected Profit) per PRD §19, via database aggregation consistent with the existing analytics approach.
- `currentValue` is a plain mutable field for this change, not a valuation history ledger — nothing in current scope reads valuation history; revisit only if/when Phase 3 portfolio performance charts (§37) are built.

**Out of scope for this change** (deferred further): the Dashboard aggregation page (PRD §7), Net Worth (§24), portfolio performance charts (Phase 3, §37).

## Capabilities

### New Capabilities
- `investments`: Investment CRUD, status lifecycle, derived principal/contribution tracking, maturity/return recording, and upcoming-maturity queries.

### Modified Capabilities
- `accounts`: Derived-balance formula extended to include investment contributions and returns (`Requirement: Derived Account Balance`).
- `transactions`: `TransactionType` gains `INVESTMENT_CONTRIBUTION` and `INVESTMENT_RETURN`, excluded from income/expense totals like `TRANSFER`.

## Impact

- **Schema**: `Investment` model; `Transaction` gains nullable `investmentId` and two new enum values; the existing CHECK constraint (per-type required-field shape) gains two more cases.
- **Services**: New `InvestmentService`; `AccountService.getBalance()`/`listWithBalances()` formula updated; `TransactionService` gains the two new transaction-creation paths (likely `InvestmentService` orchestrates these rather than exposing them as generic transaction types a UI could misuse).
- **No breaking changes** to existing `TRANSFER`/`INCOME`/`EXPENSE` behavior or shipped tests — this is additive to the `Transaction` model.
