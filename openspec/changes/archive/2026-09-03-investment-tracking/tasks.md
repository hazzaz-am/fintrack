## 1. Schema

- [x] 1.1 Add `Investment` model to `prisma/schema.prisma` per design.md's Data Model: `openingPrincipal` (Decimal, default 0), no `principalAmount`, no `accountId`
- [x] 1.2 Add `investmentId` (nullable) to `Transaction`; add `INVESTMENT_CONTRIBUTION` and `INVESTMENT_RETURN` to `TransactionType`
- [x] 1.3 Extend the `Transaction` CHECK constraint (migration.sql) so `INVESTMENT_CONTRIBUTION`/`INVESTMENT_RETURN` require `accountId` + `investmentId`, and forbid `categoryId`/`sourceAccountId`/`destinationAccountId`
- [x] 1.4 Add relation from `Transaction` to `Investment`; run migration and verify against local Postgres
- [x] 1.5 Add Zod schemas for investment create/contribute/maturity-or-withdrawal input validation

## 2. Investment Service — Core Ledger

- [x] 2.1 Implement `InvestmentService.create(userId, ...)` accepting `openingPrincipal` (default 0), no funding account required
- [x] 2.2 Implement `InvestmentService.contribute(userId, investmentId, accountId, amount, date)` — inserts an `INVESTMENT_CONTRIBUTION` transaction; reject if `accountId` doesn't belong to `userId`
- [x] 2.3 Implement `InvestmentService.createWithInitialContribution(userId, ..., accountId?, amount?)` convenience method wrapping create + first contribution in one DB transaction
- [x] 2.4 Implement `InvestmentService.getPrincipal(investmentId)` / `listWithPrincipal(userId)` as a single aggregation query per design.md D7's formula (`openingPrincipal + contributions − returns`), no N+1 across investments
- [x] 2.5 Implement `InvestmentService.update(userId, investmentId, ...)` for editable metadata (name, institution, notes, expected return, `currentValue`) — no direct write path for derived principal

## 3. Investment Service — Maturity, Withdrawal, Status

- [x] 3.1 Implement `InvestmentService.recordMaturityOrWithdrawal(userId, investmentId, accountId, principalAmount, profitAmount?, newStatus)` — inserts `INVESTMENT_RETURN` for principal, an ordinary `INCOME` transaction under "Investment Return" category for profit (if any), and updates status, all in one DB transaction
- [x] 3.2 Enforce status transitions are only set via this explicit call — no code path auto-transitions status based on `maturityDate`
- [x] 3.3 Support partial withdrawal (principal amount less than current derived principal) without forcing a status change
- [x] 3.4 Implement `InvestmentService.getUpcomingMaturities(userId)` returning `Active` investments with a computed `daysUntilMaturity` (can be negative), excluding `Matured`/`Withdrawn`/`Cancelled`

## 4. Account Balance Integration

- [x] 4.1 Update `AccountService.getBalance(accountId)` to include `− SUM(INVESTMENT_CONTRIBUTION) + SUM(INVESTMENT_RETURN)` per design.md D6's formula
- [x] 4.2 Update `AccountService.listWithBalances(userId)` (grouped query) with the same two terms, preserving the no-N+1 guarantee
- [x] 4.3 Add regression tests confirming existing `INCOME`/`EXPENSE`/`TRANSFER` balance behavior is unchanged

## 5. Investment Totals

- [x] 5.1 Implement `InvestmentService.getTotals(userId)` — total invested (derived principal sum across active investments), current estimated value (sum of `currentValue`), expected profit — via database aggregation
- [x] 5.2 Add Route Handler for investment totals

## 6. Route Handlers

- [x] 6.1 Add Route Handlers for investment CRUD, each scoped to the authenticated user via `requireAuth()`
- [x] 6.2 Add Route Handler for recording a contribution
- [x] 6.3 Add Route Handler for recording a maturity/withdrawal
- [x] 6.4 Add Route Handler for upcoming/overdue maturities

## 7. Tests

- [x] 7.1 Test: creating an investment with `openingPrincipal` only (no ledger rows) yields correct derived principal
- [x] 7.2 Test: contribution reduces funding account balance and increases investment principal by the same amount, and does not affect income/expense totals
- [x] 7.3 Test: multiple contributions to one investment from different accounts sum correctly
- [x] 7.4 Test: maturity with profit — principal via `INVESTMENT_RETURN`, profit via separate `INCOME` transaction, only profit counts toward period income
- [x] 7.5 Test: partial withdrawal reduces derived principal without forcing a status change
- [x] 7.6 Test: an investment past `maturityDate` with no recorded payout remains `Active` with negative `daysUntilMaturity`, and is never auto-transitioned
- [x] 7.7 Test: investment totals aggregation matches manually-summed expected values across several investments

## 8. Cross-Cutting Polish

- [x] 8.1 Verify every `InvestmentService` method scopes its Prisma queries by `userId` (authorization convention from design.md D5 of the prior change)
- [x] 8.2 Confirm all monetary fields (`openingPrincipal`, contribution/return amounts, `currentValue`, `expectedReturnAmount`) use `DECIMAL`/`NUMERIC`, never floating point
- [x] 8.3 Run full test suite (existing + new) and fix any regressions before moving to the next change
