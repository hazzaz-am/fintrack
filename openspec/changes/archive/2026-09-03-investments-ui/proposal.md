## Why

`investment-tracking` (archived) shipped a complete, tested `InvestmentService` — create, `createWithInitialContribution`, `contribute`, `recordMaturityOrWithdrawal`, `listWithPrincipal`, `getUpcomingMaturities`, `getTotals` — and `transactions-and-analytics-ui` already consumes `getTotals`/`getUpcomingMaturities` on the Dashboard (total invested, expected profit, and an overdue-aware upcoming-maturities list are already live at `/dashboard`). But there is still no screen to create an investment, add a contribution, or record a maturity/withdrawal at all. `nav-config.ts` has had `{ label: "Investments", href: "/investments", enabled: false }` since that change landed, waiting on exactly this follow-up.

Two inherited constraints from the existing backend shape this UI more than a typical CRUD screen would:

- `recordMaturityOrWithdrawal`'s validation (`recordMaturityOrWithdrawalSchema`) requires `newStatus: "MATURED" | "WITHDRAWN"` on every call — every recorded maturity/withdrawal closes the investment. `specs/investments/spec.md`'s "Partial early withdrawal" scenario describes principal decreasing "without forcing a status change," but that was never implemented this way; the investment-tracking test suite's own comment on this scenario says so directly. This change designs the maturity dialog around the real, shipped behavior (principal defaults to the full available amount; only Matured/Withdrawn are offered) rather than the aspirational scenario text.
- `CANCELLED` is a valid `Investment.status` enum value with no reachable code path anywhere in `InvestmentService` or its Zod schemas that can set it. This change does not add a "Cancel investment" action, since there is nothing for it to call.

Both are pre-existing backend gaps, not something this UI change fixes — see design.md's Non-Goals.

## What Changes

- Add an Investments screen (`(app)/investments`): a card grid (not a table — see design.md D21) grouped into Active (with a distinct overdue treatment per the existing `daysUntilMaturity < 0` convention already used on the Dashboard), Planned, and a collapsed "Past investments" section for Matured/Withdrawn/Cancelled, backed by `InvestmentService.listWithPrincipal`.
- Add an investment creation dialog with a funding-mode toggle ("Fund it now" vs "I already own this" vs skip-and-save-as-Planned), mapping directly onto the existing `createWithInitialContribution` service call — no new service logic.
- Add a "Contribute" dialog for adding a further `INVESTMENT_CONTRIBUTION` to an existing Planned or Active investment, backed by `InvestmentService.contribute`.
- Add a "Record maturity/withdrawal" dialog backed by `InvestmentService.recordMaturityOrWithdrawal`: principal (defaulting to the full derived principal already returned by `listWithPrincipal`, so no extra fetch), optional profit, receiving account, and an outcome choice limited to Matured/Withdrawn (matching the actual schema constraint above).
- Update `nav-config.ts`: flip `enabled: true` for Investments.

## Capabilities

### New Capabilities
- `investments-ui`: the Investments screen — card list (Active/overdue/Planned/Closed), create, contribute, and record-maturity-or-withdrawal interactions.

### Modified Capabilities
(none — `web-app-shell`'s existing "sidebar reflects full product structure" requirement is satisfied for one more module without changing that requirement itself, same as the precedent set by `transactions-and-analytics-ui`.)

## Impact

- **New code**: `src/app/(app)/investments/` (page, card list, create/contribute/maturity dialogs, Server Actions wrapping `InvestmentService`), `src/app/(app)/investments/investment-type-labels.ts` (mirroring `accounts/account-type-labels.ts`).
- **Modified**: `src/app/(app)/nav-config.ts` (one item flips to `enabled: true`).
- **Unchanged**: `InvestmentService`, its Zod validation schemas, the Prisma schema, and every existing `src/app/api/investments/**` route handler. No backend method gains or loses behavior in this change.
- **Out of scope**: fixing the `specs/investments/spec.md` "partial withdrawal, stays open" drift or adding a real code path for it; adding a `CANCELLED` transition; Savings Goals UI, Settings screen (separate, independent changes); recurring transactions, budgets, CSV export (Phase 2).
