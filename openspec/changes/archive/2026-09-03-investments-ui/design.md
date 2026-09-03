## Context

Continuing the numbering from the three prior design docs (`core-financial-architecture` D1–D5, `investment-tracking` D6–D9, `transactions-and-analytics-ui` D15–D18). This design covers the one remaining screen `investment-tracking` deliberately deferred: Investments itself (its Dashboard integration already shipped in `transactions-and-analytics-ui`).

`InvestmentService` is feature-complete and tested, but working out its UI surfaced two pre-existing gaps between what the archived `investment-tracking` design/spec describe and what actually shipped:

1. `recordMaturityOrWithdrawalSchema` requires `newStatus: z.enum(["MATURED", "WITHDRAWN"])` on every call, and the service unconditionally applies it (`data: { status: input.newStatus }`, no conditional branch). `specs/investments/spec.md`'s "Partial early withdrawal" scenario says principal "decreases... and the investment's status remains unchanged unless the user also specifies a status transition" — describing an optional/no-op status path that doesn't exist in the schema. `investment-tracking`'s own `tasks.md` item 3.3 ("Support partial withdrawal... without forcing a status change") is checked off, but the corresponding test's comment states the opposite is true: *"keep recording it as still Active is not possible via recordMaturityOrWithdrawal's schema (newStatus is required)."* The scenario in the archived spec was written before or independent of what the schema ended up enforcing.
2. `CANCELLED` is declared in `InvestmentStatus` (Prisma enum) and `investmentStatusSchema`, but no service method — not `update` (`updateInvestmentSchema` has no `status` field), not `recordMaturityOrWithdrawal` (only accepts Matured/Withdrawn) — has any path that sets it. It is currently unreachable dead enum space.

This design treats both as inherited constraints to build the UI around, not defects to fix here (see Non-Goals). Correcting `specs/investments/spec.md`'s scenario text, or adding a real "partial withdrawal that keeps an investment Active" or "cancel a Planned investment" capability, is future backend work with its own design tradeoffs (e.g., a partial withdrawal that stays Active needs a fourth `TransactionType`-adjacent concept, or a way to distinguish "this INVESTMENT_RETURN closes the investment" from "this one doesn't" — not something to decide as a side effect of a UI change).

## Goals / Non-Goals

**Goals:**
- One creation flow that maps directly onto `createWithInitialContribution`'s three existing shapes (fund now / already-owned opening principal / skip-and-stay-Planned) without a multi-step wizard.
- A maturity/withdrawal dialog that reflects the schema's actual constraint (principal amount, optional profit, Matured-or-Withdrawn outcome only) rather than the archived spec's unimplemented "stays open" scenario — `principalAmount` defaults to the already-known-available derived principal (from `listWithPrincipal`, no extra fetch) so the client-side default matches what the server will accept, with the server's `PRINCIPAL_EXCEEDS_AVAILABLE` guard as the backstop.
- A list layout where an investment's status — especially the D8 "overdue, payout not recorded" state — is legible without reading every field, matching the visual language `dashboard/page.tsx` already established (`daysUntilMaturity < 0` → `text-negative`, "Overdue by N days").
- Reuse the existing dialog/Server-Action/`useActionState` pattern (`RecordTransactionDialog`, `accounts/actions.ts`) rather than inventing a new form pattern for this screen.

**Non-Goals:**
- Fixing `specs/investments/spec.md`'s "partial withdrawal, stays open" scenario or building the backend capability it describes — flagged in Context as a real gap, not attempted here.
- Adding a `CANCELLED` transition path — same reasoning; no UI action is added that has nothing to call.
- Dashboard changes — `getTotals`/`getUpcomingMaturities` are already integrated (`transactions-and-analytics-ui`); this change only affects `/investments`.
- Editing an investment's metadata (name, institution, notes, expected return, `currentValue`) beyond what `InvestmentService.update` already exposes — a straightforward edit dialog is in scope for build, but no new service capability is needed or added for it.
- Valuation history / performance charts (`investment-tracking`'s D7 already deferred this to Phase 3).

## Decisions

### D19 — Investment creation is one dialog with a funding-mode choice, not a wizard

**Decision:** A single `InvestmentFormDialog` with three modes selected up front: "Fund it now" (shows account + contribution amount, the common case — an FDR/DPS bought today), "I already own this" (shows a single `openingPrincipal` field, no account), and a "Save without funding" toggle (skips both, leaves the investment `Planned`). All three submit through one Server Action calling `InvestmentService.createWithInitialContribution`, which already accepts all three shapes (`accountId`+`contributionAmount` together, `openingPrincipal` alone, or neither) in one DB transaction.

**Alternatives considered:**
- *Two-step wizard (create investment, then a follow-up "add first contribution?" prompt)* — rejected: this is exactly the footgun `investment-tracking`'s design.md flagged as the reason `createWithInitialContribution` exists in the first place (an orphaned zero-principal investment if a UI forgets step two). A single dialog with one submit removes the possibility.
- *Show both `openingPrincipal` and account/amount fields simultaneously, unlabeled as alternatives* — rejected: the two mechanisms exist for different real-world situations (D9: ledger-backed funding vs. a pre-existing untracked asset); presenting both at once as generic fields invites filling in the wrong one.

**Consequence:** Creating an investment is always one form submission, regardless of which of the three shapes the user needs.

### D20 — Maturity/withdrawal dialog matches the schema's actual constraint, not the archived spec's aspirational scenario

**Decision:** `RecordMaturityDialog` shows: receiving account, principal amount (input, pre-filled with the investment's current derived principal as already computed by `listWithPrincipal` — the same value the card already displays, no separate fetch), profit amount (optional, separate field, becomes the `INCOME` transaction per PRD Rule 4), and an outcome radio limited to Matured / Withdrawn (matching `recordMaturityOrWithdrawalSchema`'s enum exactly — no third "stays Active" option, since the server has nothing to do with it). Outcome pre-selects Matured if today ≥ `maturityDate`, else Withdrawn — a suggestion the user can override, consistent with D8's "user-asserted, never inferred silently" principle (it's a default, not an automatic decision). Client-side validation rejects `principalAmount` greater than the known available principal before submit, mirroring the server's `PRINCIPAL_EXCEEDS_AVAILABLE` error so it's never the first time the user sees that constraint.

**Alternatives considered:**
- *Offer partial withdrawal as "stays Active," per `specs/investments/spec.md`'s scenario* — rejected: would require the UI to promise behavior the schema cannot deliver; submitting would either 400 on a status the user didn't ask for, or require silently picking Matured/Withdrawn on the user's behalf, which is worse than not offering the option.
- *Default `principalAmount` to empty, forcing the user to type the full amount even for a full closure* — rejected: full closure (returning all available principal) is the common case per the PRD's own examples (§17, §20); defaulting to the known available amount removes a redundant lookup-and-retype step for the common path, while remaining fully editable for a genuine shortfall (recovered less than invested).

**Consequence:** The dialog never claims a capability the backend doesn't have; the "partial withdrawal that keeps investing" gap identified in Context stays visible as a real product gap (documented, not hidden by UI copy) rather than being papered over.

### D21 — Cards, not a table

**Decision:** `/investments` renders a card grid, not the dense table pattern used by Transactions. Each card shows: name, type/institution, status badge, principal, expected return, and — for Active investments — a maturity countdown using the same `daysUntilMaturity < 0` → overdue-styling convention `dashboard/page.tsx` already established, so the same "days until maturity" fact reads identically on both screens.

**Alternatives considered:**
- *Table, matching Transactions* — rejected: Investments is browsed occasionally (few rows, not searched/filtered/paginated like the transaction ledger), and its defining fact per screen — status + countdown — needs to read at a glance, which a status badge in a card does better than a status column in a dense row of otherwise-similar-looking numbers.

**Consequence:** No new table/filter/pagination infrastructure needed for this screen; the card component is the only new list-rendering pattern this change introduces.

### D22 — Closed investments collapse into a separate section by default

**Decision:** The primary grid shows Active and Planned investments. Matured/Withdrawn/Cancelled investments render in a collapsed "Past investments" section below (closed by default, no action buttons, muted styling), rather than mixed into the primary grid or omitted entirely.

**Alternatives considered:**
- *One flat grid, all statuses together* — rejected: as investments close over the years, the primary grid — whose entire purpose is showing what's currently active and what's coming up — would increasingly be dominated by history rather than by the two things D8 and D21 exist to make legible.
- *Omit closed investments from `/investments` entirely (they're still visible via Reports' Investment Report)* — rejected: a user reviewing "what did I invest in" loses continuity if closed investments vanish from the one page dedicated to investments; a collapsed section costs little and keeps the page complete.

**Consequence:** `listWithPrincipal` (already returns every investment regardless of status, per its existing implementation) is grouped client/server-side into three buckets — Active, Planned, Closed — no new service query.

## Risks / Trade-offs

- **[Risk]** Users may expect "partial withdrawal, investment stays open" (it's a reasonable real-world need — pulling some money out of a DPS early while it keeps running) and be surprised it isn't offered → **Mitigation:** accepted for this change (Context); D20's dialog is honest about what happens (Matured/Withdrawn only) rather than implying a capability that doesn't exist. Worth a fast-follow backend change if this turns out to matter in practice.
- **[Trade-off]** Pre-filling `principalAmount` to the full available amount (D20) means a user who *does* want to under-report (a shortfall) must actively edit the field down, rather than building up from zero → accepted; full closure is the more common case per the PRD's own examples, and the field remains freely editable either direction.
- **[Trade-off]** Collapsing closed investments by default (D22) means a first-time user with only closed/demo investments sees mostly the empty-active-grid state → acceptable; an empty-active state already needs its own empty-state design regardless (a brand-new user with zero investments faces the identical case).

## Migration Plan

Additive only — no existing screens or services change behavior; `nav-config.ts` flips one `enabled` flag once the screen lands.

1. `src/app/(app)/investments/investment-type-labels.ts` — display labels for the ten `investmentTypeSchema` enum values, mirroring `accounts/account-type-labels.ts`.
2. `src/app/(app)/investments/actions.ts` — Server Actions: create (wrapping `createWithInitialContribution`), contribute, record-maturity-or-withdrawal, update (metadata edit), each via `useActionState`-compatible `{error?, fieldErrors?, success?}` state, `revalidatePath("/investments")` (and `/dashboard`, since its totals/maturities read the same underlying data) on success.
3. `InvestmentFormDialog` (D19).
4. `ContributeDialog` — account + amount + date, reusing the same field/error pattern as `RecordTransactionDialog`.
5. `RecordMaturityDialog` (D20).
6. `investment-card.tsx` + `investment-list.tsx` (D21, D22) — grouping into Active/Planned/Closed, overdue styling matching `dashboard/page.tsx`'s existing convention.
7. `src/app/(app)/investments/page.tsx` — Server Component, `InvestmentService.listWithPrincipal(userId)`, empty state for zero investments.
8. `nav-config.ts`: flip `enabled: true` for Investments.

## Open Questions

None outstanding for this change's scope. The two backend gaps identified in Context (partial-withdrawal-stays-open, unreachable `CANCELLED`) are documented as candidate future changes, not questions blocking this one.
