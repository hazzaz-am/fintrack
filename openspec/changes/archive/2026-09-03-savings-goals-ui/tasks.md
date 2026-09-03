## 1. Backend: update & archive

- [x] 1.1 Add `updateSavingsGoalSchema` to `src/lib/validation/savings-goal.ts` (partial: name, targetAmount, targetDate nullable, description nullable — mirror `updateAccountSchema`'s shape).
- [x] 1.2 Add `SavingsGoalService.update(userId, goalId, input)` — `getOwnedGoalOrThrow` then `prisma.savingsGoal.update`, no cross-check against allocated total (design.md D3).
- [x] 1.3 Add `SavingsGoalService.archive(userId, goalId)` — `getOwnedGoalOrThrow` then set `status: "ARCHIVED"`, unconditional (design.md D1, mirrors `AccountService.archive`).
- [x] 1.4 Add `PATCH /api/savings-goals/[goalId]/route.ts` calling `SavingsGoalService.update`, following the exact structure of `src/app/api/accounts/[accountId]/route.ts`.
- [x] 1.5 Add `POST /api/savings-goals/[goalId]/archive/route.ts` calling `SavingsGoalService.archive`, following the exact structure of `src/app/api/accounts/[accountId]/archive/route.ts`.

## 2. Backend tests

- [x] 2.1 In `tests/savings-goal-service.test.ts`, add: update changes name/targetAmount/targetDate/description; update succeeds even when new targetAmount is below the already-allocated total (progress then reports achieved).
- [x] 2.2 Add: update/archive both reject a goal owned by a different user (`AppError`, not-found).
- [x] 2.3 Add: archive sets status to `ARCHIVED` without touching existing `GoalAllocationEvent` rows (assert the events and their sum are unchanged before/after).
- [x] 2.4 Add: `getProgress` reports achieved (`totalAllocated >= targetAmount`) correctly both when crossed via `allocate` and when dropped back below via `moveAllocation` out (design.md D2, spec's two achieved-state scenarios).

## 3. Page skeleton

- [x] 3.1 Create `src/app/(app)/savings-goals/page.tsx` — server component: `requireAuth`, fetch `SavingsGoalService.list`, then `getProgress` per goal, then `AccountService.listWithBalances` for the accounts needed by dialogs, then `getAccountAllocationStatus` once per distinct account referenced across all goals' `byAccount` (deduped) to build an `isOverAllocated` map (design.md D6). Flatten all Decimal fields to strings before passing to client components (mirror `InvestmentsPage`'s comment on why).
- [x] 3.2 Create `src/app/(app)/savings-goals/savings-goal-list.tsx` — client component: empty state (mirror `InvestmentList`'s `Empty`/`EmptyHeader` usage) vs. grid split into Active and a `Collapsible` "Archived goals (N)" section, mirroring `InvestmentList`'s open/closed split exactly.
- [x] 3.3 Create `src/app/(app)/savings-goals/savings-goal-card.tsx` — `Card` showing name, progress bar (allocated/target), achieved badge when applicable, target date, per-account allocation breakdown list, over-allocation warning badge when the account map flags any contributing account, and a footer with Allocate / Move / Edit (Active only) / Archive (Active only) actions — mirror `InvestmentCard`'s structure (`CardHeader`/`CardAction` for edit, `CardFooter` for actions, `closed` prop to dim archived cards and hide edit/archive/allocate/move).

## 4. Actions & dialogs

- [x] 4.1 Create `src/app/(app)/savings-goals/actions.ts` — `"use server"` module with `createGoalAction`, `updateGoalAction`, `archiveGoalAction`, `allocateAction`, `moveAllocationAction`, each following the `useActionState`-compatible `(prevState, formData)` shape and `AppError` handling from `investments/actions.ts`; each revalidates `/savings-goals` (and `/dashboard` if the dashboard reads goal data — verify during 5.x).
- [x] 4.2 Create `savings-goal-form-dialog.tsx` — single dialog handling both create and edit (accepts an optional `goal` prop like `InvestmentFormDialog` accepts `investment`), fields: name, target amount, target date, description.
- [x] 4.3 Create `archive-goal-dialog.tsx` — `AlertDialog`-based confirmation, mirroring `ArchiveAccountDialog` exactly (trigger icon button, confirm/cancel, pending state via `useTransition`).
- [x] 4.4 Create `allocate-dialog.tsx` — account selector (from the goal's owning user's accounts) + amount, submits via `allocateAction`, surfaces the server's `ALLOCATION_EXCEEDS_BALANCE` message inline on rejection without closing the dialog.
- [x] 4.5 Create `move-allocation-dialog.tsx` — source goal fixed to the card it's opened from; destination goal selector (other Active goals); account selector scoped to accounts this goal currently has allocations from (from `getProgress().byAccount`, passed down as a prop); amount capped client-side to that account's currently-allocated-to-this-goal figure (design.md D5).

## 5. Wire-up

- [x] 5.1 Flip `Savings Goals` to `enabled: true` in `src/app/(app)/nav-config.ts`.
- [x] 5.2 Check whether the Dashboard already reads any savings-goals data (PRD §7/§26 mention a goals summary) — if a revalidation path is needed there, add it to the actions in 4.1. (Confirmed: Dashboard's current fetch set has no savings-goals data; no revalidation path needed.)
- [x] 5.3 Run `bunx tsc --noEmit`, the test suite, and lint; fix any type or lint issues surfaced by the new files. (tsc clean, 51/51 tests pass; lint's 2 errors are pre-existing in `carousel.tsx`/`use-mobile.ts` on `main`, unrelated to this change.)

## 6. Manual verification

- [x] 6.1 Start the dev server, create a goal, allocate from two different accounts, confirm the per-account breakdown and progress bar render correctly. (Verified via browse QA: Marriage goal, 60k from Bank A + 60k from Bank B, card showed both accounts and 40% progress.)
- [x] 6.2 Allocate past an account's unallocated balance and confirm the dialog shows the rejection without closing. (Verified: attempted 120k against Bank A's 100k balance, dialog stayed open with "Only 100000.00 is unallocated on this account.")
- [x] 6.3 Move an allocation between two goals and confirm both cards update without a full reload. (Verified: moved 30k from Marriage/Bank A to Travel; both cards updated, client-side cap also verified — over-cap amount disabled the submit button with an inline message before any server round trip.)
- [x] 6.4 Edit a goal's target below its allocated total and confirm the achieved badge appears immediately. (Verified: lowered Marriage's target from 300k to 50k against 90k allocated; "Achieved" badge appeared immediately.)
- [x] 6.5 Archive a goal and confirm it moves to the collapsed Archived section with its allocation history intact. (Verified: archived Travel; moved to "Archived goals (1)", still showing its 60% progress and Bank A ৳30,000.00 breakdown.)
- [x] 6.6 Retroactively edit a transaction to push a contributing account over-allocated and confirm the warning badge appears on the goal card. (Verified: recorded a ৳70,000 expense on Bank A, dropping its balance below what's allocated; Marriage's card showed "Bank A allocated more than its current balance.")

**QA notes (not part of this change, observed incidentally):** a pre-existing console warning from `TransactionFilters`'s "Apply filters" button (`Base UI: ... nativeButton` prop mismatch) fires on `/transactions` — unrelated file, not touched by this change, not introduced by it.
