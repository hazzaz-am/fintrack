## 1. Type labels

- [x] 1.1 Create `src/app/(app)/investments/investment-type-labels.ts`: display labels for the ten `investmentTypeSchema` values, mirroring `accounts/account-type-labels.ts`

## 2. Server Actions

- [x] 2.1 Create `src/app/(app)/investments/actions.ts`: `createInvestmentAction` wrapping `InvestmentService.createWithInitialContribution` (design.md D19), `{error?, fieldErrors?, success?}` state, `revalidatePath("/investments")` + `revalidatePath("/dashboard")` on success
- [x] 2.2 `contributeAction` wrapping `InvestmentService.contribute`
- [x] 2.3 `recordMaturityAction` wrapping `InvestmentService.recordMaturityOrWithdrawal` — `newStatus` field restricted to `MATURED`/`WITHDRAWN` only (design.md D20)
- [x] 2.4 `updateInvestmentAction` wrapping `InvestmentService.update` (metadata edit: name, institution, maturityDate, expected return, currentValue, notes)

## 3. Create dialog

- [x] 3.1 Build `InvestmentFormDialog`: mode selector (Fund it now / I already own this / Save without funding), conditional fields per mode (design.md D19) — implemented with `Tabs`, matching `RecordTransactionDialog`'s established mode-switch pattern rather than introducing `RadioGroup` as a new form idiom; also doubles as the edit dialog (accepts an optional `investment` prop, mirroring `AccountFormDialog`) so `updateInvestmentAction` (2.4) has a UI consumer
- [x] 3.2 "Fund it now" mode: account select + contribution amount, both required together
- [x] 3.3 "I already own this" mode: opening principal field only
- [x] 3.4 "Save without funding" mode: hides both, submits with zero principal (Planned)
- [x] 3.5 Always-shown fields: name, type, institution, start date, maturity date, expected return amount/rate, notes — in edit mode, type/start date render as a read-only line instead of inputs (not editable via `updateInvestmentSchema`)

## 4. Contribute dialog

- [x] 4.1 Build `ContributeDialog`: account + amount + date + optional description, reusing the field/error pattern from `RecordTransactionDialog`
- [x] 4.2 Only rendered/available for Planned or Active (non-overdue) investments (spec: investments-ui) — overdue-Active cards omit Contribute per design.md D21/tasks 6.2, since an overdue instrument reads as "close this out," not "add more"

## 5. Record maturity/withdrawal dialog

- [x] 5.1 Build `RecordMaturityDialog`: receiving account, principal (pre-filled with the investment's current derived principal, editable), optional profit, outcome tabs limited to Matured/Withdrawn (design.md D20)
- [x] 5.2 Pre-select outcome based on today vs. `maturityDate` (Matured if past/at, else Withdrawn), user-overridable
- [x] 5.3 Client-side validation: reject principal greater than the known available amount before submit (spec: investments-ui) — verified live: submit disables and an inline error renders the instant the typed amount exceeds available principal, no server round trip
- [x] 5.4 Only rendered/available for Active investments

## 6. List / cards

- [x] 6.1 Build `investment-card.tsx`: name, type/institution, status badge, principal, expected return, and for Active investments a maturity countdown using the dashboard's existing `daysUntilMaturity < 0` overdue convention (design.md D21)
- [x] 6.2 Distinct card treatment for Planned (no principal/countdown yet, "Fund this" CTA opening `ContributeDialog`) and overdue-Active (warning tone, no Contribute action, "Record maturity" CTA)
- [x] 6.3 Build `investment-list.tsx`: groups `listWithPrincipal` results into Active (including Planned) and Closed (Matured/Withdrawn/Cancelled) buckets (design.md D22)
- [x] 6.4 "Past investments" section: collapsed by default, no action buttons, muted styling
- [x] 6.5 Empty state for zero investments

## 7. Page

- [x] 7.1 Build `src/app/(app)/investments/page.tsx`: Server Component, `InvestmentService.listWithPrincipal(userId)` merged with `getUpcomingMaturities(userId)` for `daysUntilMaturity` (no new service query — reuses both existing reads), normalizes Decimal fields to strings before crossing into Client Components, renders `investment-list.tsx` + `InvestmentFormDialog` trigger

## 8. Navigation

- [x] 8.1 Update `src/app/(app)/nav-config.ts`: flip `enabled: true` for Investments

## 9. Verification

- [x] 9.1 Manual walkthrough (live, via browser automation): created an investment in each of the three funding modes — "BRAC Bank FDR" (fund now, ৳200,000 contribution), "Family Land" (already-owned, ৳500,000 opening principal, Real Estate, no account), "City Bank DPS" (skip funding) — each landed in the correct status (Active/Active/Planned) matching design.md D19's scenarios
- [x] 9.2 Manual walkthrough: contributed ৳5,000 to the Planned "City Bank DPS" via "Fund this" — confirmed it transitioned to Active with principal ৳5,000
- [x] 9.3 Manual walkthrough: recorded BRAC Bank FDR's maturity (principal ৳200,000 + profit ৳16,000, outcome Matured) — confirmed the investment moved into the collapsed "Past investments" section with principal correctly derived to ৳0, and Dashboard totals reconciled exactly by hand: total balance ৳111,000.00 (100,000 opening − 200,000 − 5,000 contributions + 200,000 return + 16,000 profit), income this month ৳16,000.00 (profit only — principal excluded per Rule 4), total invested ৳505,000.00 (Matured investment correctly excluded from the Active-only aggregate), no upcoming maturities (Matured excluded per D8)
- [x] 9.4 Confirmed live: typing a principal amount above the investment's available principal disables the Record button and renders "Only BDT 200,000.00 of principal is available on this investment." inline, before any submit — screenshotted for the record
- [x] 9.5 Confirmed live: created a test investment with a past maturity date — rendered "Overdue by 33 days" in the negative/red tone, with Contribute omitted and only "Record maturity" offered, visually distinct from the healthy Active cards alongside it — screenshotted
- [x] 9.6 Confirmed live: Contribute/Record maturity are both absent on the Matured card in "Past investments"; only "Fund this" (no Record maturity) appears on the Planned card; overdue-Active shows only "Record maturity" (no Contribute)
- [x] 9.7 Full test suite passes, no regressions: 46/46 tests pass (unchanged from baseline — this change adds no new service code to test, per proposal.md's Impact). `tsc --noEmit`, `next build`, and `eslint` (this change's files) all clean.
