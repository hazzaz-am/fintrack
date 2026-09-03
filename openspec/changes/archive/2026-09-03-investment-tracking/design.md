## Context

The `core-financial-architecture` change (archived) established a pattern used twice: `Transaction` as the single append-only ledger that `Account` balances derive from (design D1), and `GoalAllocationEvent` as a second append-only ledger that goal totals derive from (D2). Both exist specifically so that "current state" is never a mutable field a write path can forget to update — it's always a query over history.

Investments break new ground the first two capabilities didn't have to handle: buying an investment means money genuinely leaves a bank account's real, spendable balance (unlike goal allocation, which is purely a virtual earmark — Rule 3, §29 — the money never leaves the bank). If investment purchases aren't reflected in the ledger that `Account.getBalance()` reads, `Total Available Balance` (§7) and the eventual Net Worth calculation (§24) will double-count money that is simultaneously "in the bank" and "in the FDR." This design resolves that before any `Investment` schema or service code is written, continuing the precedent set by the prior design doc.

## Goals / Non-Goals

**Goals:**
- Make investment purchases and payouts reduce/increase the funding account's balance through the *same* mechanism (`Transaction` ledger + aggregation) already used for everything else, rather than a parallel bookkeeping path.
- Derive `Investment` principal from ledger history, not a stored field, so recurring contributions (DPS-style) and partial withdrawals are ordinary ledger rows, not special operations.
- Keep PRD Rule 4 (§29 — investment principal is not investment income) a structural property: principal movement and profit-income are always two distinct transaction records, never one blended amount.
- Preserve the existing `transactions` capability's shipped, tested behavior (`INCOME`/`EXPENSE`/`TRANSFER`) unchanged.

**Non-Goals:**
- Valuation history / performance tracking for market-based instruments (stocks, crypto, mutual funds) — `currentValue` is a plain mutable field for this change (no consumer in scope depends on its history yet); see D7's Risk mitigation for the upgrade path when Phase 3 (§37, "Portfolio performance charts") is actually built.
- Dashboard aggregation page, Net Worth calculation — deferred to a `dashboard` change that will consume this capability's totals.
- Multi-currency investment handling — same MVP assumption as `accounts` (single currency).

## Decisions

### D6 — Investment money movement rides the `Transaction` ledger

**Decision:** Add `INVESTMENT_CONTRIBUTION` and `INVESTMENT_RETURN` to `TransactionType`. Each such row has `accountId` (the funding/receiving account) + a new nullable `investmentId` column on `Transaction`, amount always positive, no `categoryId`. Both types are excluded from income/expense aggregation, identically to how `TRANSFER` is excluded today (§21 Rule 1/2, generalized: money moving between two of the user's own asset containers — a second account or an investment — is neither income nor expense).

`Account.getBalance()` gains two more terms:

```
balance = openingBalance
        + SUM(INCOME)
        − SUM(EXPENSE)
        + SUM(TRANSFER, destinationAccountId = this)
        − SUM(TRANSFER, sourceAccountId = this)
        − SUM(INVESTMENT_CONTRIBUTION, accountId = this)
        + SUM(INVESTMENT_RETURN, accountId = this)
```

Investment profit (the amount above principal) is recorded as a completely ordinary `INCOME` transaction under category "Investment Return" — a second, separate transaction from the `INVESTMENT_RETURN` principal row, created in the same DB transaction when a user records a payout.

**Alternatives considered:**
- *Generalize `TRANSFER` itself* (add optional `sourceInvestmentId`/`destinationInvestmentId` alongside the existing account IDs, so "transfer" means between any two containers) — more conceptually pure (it genuinely is the same accounting rule), but requires modifying the CHECK constraint, relations, and query shape of an already-shipped, already-tested capability. Rejected for this change to keep the blast radius inside `investments`; revisit if a third container type appears later and the duplication starts to hurt.
- *No ledger link — investment purchase is untracked / a manual account balance adjustment* — rejected outright: this is exactly the "stored, manually-updated state that silently drifts" failure mode D1 already rejected for account balances.
- *Model investment funding as an `EXPENSE`* — rejected: the money isn't spent/gone, it's still the user's asset, just illiquid; blending it into expense totals would corrupt monthly spending analytics (§14) with non-spending outflows.

**Consequence:** `Investment` becomes a third kind of ledger participant, alongside `Account` and `SavingsGoal`. All three now share the identical shape: append-only fact rows in `Transaction` (or `GoalAllocationEvent`), current state always derived via aggregation.

### D7 — Investment principal is derived, not stored

**Decision:** `Investment` has no stored `principalAmount` field that write paths update. Net principal currently committed = `openingPrincipal + SUM(INVESTMENT_CONTRIBUTION) − SUM(INVESTMENT_RETURN)` for that `investmentId` (see D9 for `openingPrincipal`), computed the same way `Account.getBalance()` and `GoalAllocationEvent` totals are computed.

**Alternatives considered:**
- *Stored `principalAmount`, set once at creation* — matches the PRD's literal §17 field list and is simpler for the common case (single lump-sum FDR/DPS purchase), but can't represent recurring contributions (DPS is explicitly a monthly-deposit instrument, §16) or partial early withdrawals without a bolted-on adjustment mechanism. Rejected for the same reason D1 rejected stored account balances.

**Consequence:** Creating an `Investment` and making its first contribution are two steps (create the `Investment` record, then record an `INVESTMENT_CONTRIBUTION` against it) rather than one — the service layer should expose a convenience method that does both in one DB transaction so this doesn't become a UX or data-integrity footgun (an `Investment` with zero contributions is a valid but unusual state, e.g. `status = Planned`).

**Resolved — valuation history:** `currentValue` stays a single mutable, user-overwritten field for this change; no valuation ledger. Nothing in current scope reads valuation *history* (unlike balance/principal, which downstream totals depend on being accurate at every point in time) — the append-only pattern is justified by a consumer needing derived correctness, not by "we might want history later." If Phase 3 portfolio performance charts get built, add an append-only `InvestmentValuation` ledger behind the same read interface then; see Risks for the mitigation this relies on.

### D8 — Status transitions are user-asserted, not automatic

**Decision:** `Investment.status` (`Planned → Active → Matured/Withdrawn/Cancelled`) only changes via an explicit service call, never a background job or a read-time computation based on `maturityDate`. Recording a maturity or withdrawal is one action that both transitions status and creates the `INVESTMENT_RETURN` (+ optional `INCOME`) transactions in a single DB transaction — status and the money movement it represents can never disagree.

**Alternatives considered:**
- *Auto-transition to `Matured` when `maturityDate` passes* — rejected: PRD §20's phrasing ("the user should be able to **record**...") implies the payout is a real-world event the user reports after it happens (bank transfers proceeds on their own schedule), not a calendar fact. Auto-flipping status would claim money has moved before it actually has.

**Consequence:** An investment can be past its `maturityDate` while still `status = Active` — this is a real, valid, and important state (payout pending/overdue), not a bug. `InvestmentService.getUpcomingMaturities()` returns a computed `daysUntilMaturity` (can go negative) rather than a boolean, the same "computed field, not a UI-side calculation" convention as `isOverAllocated` (D3). The UI buckets it into: positive → "matures in N days"; zero/negative + still `Active` → "overdue, payout not recorded" (distinct warning state); `Matured`/`Withdrawn` → excluded from the list entirely.

### D9 — No `accountId` on `Investment`; opening principal instead

**Decision:** `Investment` has no `accountId` field at all, departing from the PRD's §28 sketch. `accountId` lives only on the `Transaction` rows (`INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN`, per D6) that fund or pay out a given investment. For investments with no ledger history — an asset the user already owns and is just recording, e.g. real estate or a business stake purchased before this system existed — `Investment` gets an `openingPrincipal` field (default 0), mirroring `Account.openingBalance` exactly: a non-ledger starting point that ledger-derived movement builds on top of (see D7's updated formula).

**Alternatives considered:**
- *Required `accountId` on `Investment`, per PRD §28* — rejected: forces every investment through a single funding account, which breaks down for (a) instruments funded from multiple accounts over time (DPS/mutual-fund top-ups, the same multi-source need §9 already establishes for savings goals), and (b) already-owned assets with no natural "funding account" at all (real estate, a business stake). Requiring users to fabricate a placeholder account to satisfy the schema would be a modeling workaround, not a real answer.
- *Optional `accountId` on `Investment`, used only as a "primary" display hint* — rejected as redundant: it would just cache what's already derivable by looking at which accounts have `INVESTMENT_CONTRIBUTION` rows for that investment, reintroducing a field that can drift from the ledger it's supposedly summarizing.

**Consequence:** An investment can be created three ways: (1) fully tracked — `openingPrincipal = 0`, funded entirely via `INVESTMENT_CONTRIBUTION` rows, e.g. an FDR bought from BRAC Bank; (2) pre-existing/untracked — `openingPrincipal` set once at creation, no ledger rows, no `accountId` anywhere, e.g. real estate already owned; (3) mixed — `openingPrincipal` for the pre-existing portion plus later `INVESTMENT_CONTRIBUTION` top-ups. All three share one derivation formula (D7); nothing branches on "which kind" of investment this is.

## Data Model (this change)

```
Investment { id, userId, name, type, institution?, openingPrincipal (default 0),
             startDate, maturityDate?, expectedReturnAmount?, expectedReturnRate?,
             currentValue?, status[Planned|Active|Matured|Withdrawn|Cancelled], notes?,
             createdAt, updatedAt }
  -- no principalAmount column (D7); no accountId column (D9)

Transaction {
  ...existing fields...
  investmentId String?   -- populated only for INVESTMENT_CONTRIBUTION / INVESTMENT_RETURN
}

TransactionType: INCOME | EXPENSE | TRANSFER | INVESTMENT_CONTRIBUTION | INVESTMENT_RETURN
```

Notes:
- `accountId` is populated on `INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN` rows (the account funding or receiving the money), never on `Investment` itself (D9) — the CHECK constraint gains: these two types require `accountId` + `investmentId`, no `categoryId`, no `sourceAccountId`/`destinationAccountId`.
- `currentValue` is a plain mutable field for this change (D7 resolution) — for fixed-return instruments it can be computed/validated against `expectedReturnRate` + elapsed time at the service layer; for market-based instruments it's user-entered and simply overwritten on update, with no history retained.

## Risks / Trade-offs

- **[Risk]** `currentValue` as a single mutable field loses history for market-based instruments the moment it's overwritten → **Mitigation:** accepted for now (D7); if/when portfolio performance charts (Phase 3) are built, add an append-only `InvestmentValuation` ledger behind the same `InvestmentService.getCurrentValue()` interface — callers don't change. Same escape hatch pattern as D1's balance-aggregation risk mitigation.
- **[Risk]** Two-step creation (create `Investment`, then contribute) could leave orphaned zero-contribution investments if a UI doesn't wrap both calls → **Mitigation:** service layer exposes a single `createWithInitialContribution()` convenience method wrapping both in one DB transaction; bare `create()` remains available for genuinely `Planned` (not-yet-funded) or opening-principal-only investments.
- **[Trade-off]** Not generalizing `TRANSFER` (D6 alternative) means the concept "money moved between two of my own asset containers" is now expressed by three type values (`TRANSFER`, `INVESTMENT_CONTRIBUTION`, `INVESTMENT_RETURN`) instead of one — accepted to avoid touching shipped code; worth revisiting if a fourth container type (e.g. liabilities/debt, §37) shows up later.
- **[Trade-off]** Dropping `Investment.accountId` (D9) is a deliberate departure from the PRD's §28 schema sketch → documented here as an intentional, justified deviation, same category as D2's departure from the PRD's literal `GoalAllocation` schema.

## Migration Plan

Additive only — no existing `Investment` data, and no change to existing `TRANSFER`/`INCOME`/`EXPENSE` rows or their CHECK constraint cases.
1. Add `Investment` model (including `openingPrincipal`, no `accountId`); add nullable `investmentId` to `Transaction`; add the two new `TransactionType` enum values; extend the CHECK constraint with the two new per-type shape rules.
2. Build `InvestmentService`: `create`, `createWithInitialContribution`, `contribute` (recurring/partial), `recordMaturityOrWithdrawal` (status transition + `INVESTMENT_RETURN` + optional `INCOME`), `getPrincipal`/`listWithPrincipal` (derived, grouped query — no N+1, matching `AccountService.listWithBalances()`), `getUpcomingMaturities` (with `daysUntilMaturity`, per D8).
3. Update `AccountService.getBalance()`/`listWithBalances()` to include the two new terms.
4. Route Handlers for investment CRUD and the maturity/withdrawal action.

## Open Questions

None outstanding — the three questions raised in the initial draft of this document (valuation history, overdue surfacing, `accountId` requirement) are resolved above in D7–D9.
