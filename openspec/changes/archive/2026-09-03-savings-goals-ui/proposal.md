## Why

Savings Goals is PRD §9's stated core differentiator and is explicit MVP scope (§35, §44), but it has no screen — the sidebar nav entry is hard-disabled (`enabled: false` in `nav-config.ts`). The backend is also only half-built: goals can be created, funded (`allocate`), moved between goals (`moveAllocation`), and read back (`getProgress`), but there is no way to edit a goal or archive one, even though the PRD lists both as required Goal Features (§9) and Functional Requirements (§30). Users currently cannot see or manage savings goals at all through the product.

## What Changes

- Add `SavingsGoalService.update()` and `SavingsGoalService.archive()`, with corresponding Zod validation schemas and API routes (`PATCH /api/savings-goals/[goalId]`, `POST /api/savings-goals/[goalId]/archive`).
- Add a `/savings-goals` screen: server page fetching goals + progress + accounts, a card grid (mirroring the Investments page skeleton — server page → client list → card → form dialogs, `useActionState` server actions), split into active goals and a collapsible archived section.
- Each goal card shows: name, saved/target amounts, progress bar, target date, per-account allocation breakdown, and an "achieved" badge derived at render time (`allocated >= target`) — **not** a stored status value. `SavingsGoalStatus` continues to hold only `ACTIVE`/`ARCHIVED`, changed solely by explicit user action via update/archive.
- Add a "Move to another goal…" dialog off the goal card, backed by the existing `moveAllocation` service method, following the same dialog/server-action pattern as `ContributeDialog`.
- Surface the existing over-allocation warning (`getAccountAllocationStatus.isOverAllocated`) as a badge on any goal card whose contributing account is over-allocated.
- Enable the "Savings Goals" nav item in `nav-config.ts` once the screen ships.

**Explicitly out of scope:** adding the allocation breakdown to the Accounts page (PRD §8/§26 account-card mockup). That's a real but separate PRD intent, noted here as a follow-on so this change stays reviewable.

## Capabilities

### New Capabilities
- `savings-goals-ui`: The `/savings-goals` screen — goal cards, progress display, allocate/move/edit/archive interactions, and the derived achieved/over-allocated badges.

### Modified Capabilities
- `savings-goals`: Adds `update` (edit name/target amount/target date/description) and `archive` (status → `ARCHIVED`) as new requirements alongside the existing create/allocate/moveAllocation/getProgress behavior. Also formalizes that "achieved" is a derived read-time state, never a stored status transition.

## Impact

- `src/lib/services/savings-goal-service.ts`: new `update`, `archive` methods.
- `src/lib/validation/savings-goal.ts`: new `updateSavingsGoalSchema`.
- `src/app/api/savings-goals/[goalId]/route.ts` (new), `src/app/api/savings-goals/[goalId]/archive/route.ts` (new).
- `src/app/(app)/savings-goals/` (new): `page.tsx`, `savings-goal-list.tsx`, `savings-goal-card.tsx`, `savings-goal-form-dialog.tsx`, `allocate-dialog.tsx`, `move-allocation-dialog.tsx`, `actions.ts`.
- `src/app/(app)/nav-config.ts`: flip Savings Goals `enabled` to `true`.
- `tests/savings-goal-service.test.ts`: new coverage for `update`/`archive`.
