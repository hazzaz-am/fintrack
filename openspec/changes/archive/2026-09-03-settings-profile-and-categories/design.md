## Context

Two capabilities are getting their first edit/delete surface: `user-auth` (currently only register/login/logout/getCurrentUser — no user field has ever been editable post-registration) and `categories` (currently only create/list — no update or delete at any layer). Deletion looked low-risk going in — the transactions table already renders `"—"` for a missing category name, and `AnalyticsService.getCategoryBreakdown` had an `?? "Uncategorized"` fallback that looked like a safety net for an orphaned category reference.

Both turned out to be red herrings, discovered in sequence while writing this change's own tests:

1. First, `getCategoryBreakdown`'s `groupBy` filtered `categoryId: { not: null }`, so an orphaned-category transaction would be silently *excluded* from breakdown charts rather than summed as "Uncategorized." Looked fixable in isolation — until:
2. The actual delete attempt failed at the database level: `prisma/migrations/20260902181911_add_transaction_type_check`'s `transactions_type_shape_check` CHECK constraint requires `categoryId IS NOT NULL` on every INCOME/EXPENSE row, unconditionally, as a foundational invariant from `core-financial-architecture`. Prisma's `onDelete: SetNull` cascade can't satisfy that — the database rejects the delete outright. A category referenced by any transaction cannot be orphaned, full stop; nulling was never actually possible, so (1) was never a real bug to begin with. Its fix was reverted once (2) was found — `getCategoryBreakdown` is back to its original form, dead-code fallback and all, exactly as it was before this change.

Resolved with the user: deletion of an in-use category is **blocked**, not silently absorbed — see D1 below. This is a smaller, safer surface than the originally-proposed "delete always succeeds, orphaned rows become Uncategorized," and the `categories`/`settings-ui` spec deltas below were edited in place to match, since this change hasn't shipped yet.

The closest precedent for "resource-scoped edit form + delete/archive with confirmation" is Accounts (`AccountService.update`/`.archive`, `PATCH /api/accounts/[accountId]`, an `AlertDialog`-based archive confirmation) and, for a settings-style page composing multiple independent sections, there's no existing precedent in this codebase — every other screen so far is single-capability.

## Goals / Non-Goals

**Goals:**
- Close the `update`/`delete` gap on `CategoryService` and add profile-editing/password-change to `AuthService`, using the exact `PATCH [id]` route + owned-resource-check pattern already established for Accounts.
- Ship a `/settings` screen composing both as independent sections on one page.
- Make category deletion respect the database's existing `transactions_type_shape_check` invariant (every INCOME/EXPENSE row keeps a category) rather than fighting it.

**Non-Goals:**
- Currency, Theme, Account types, Data export/import — each needs its own prior decision (see proposal.md Impact) and is not touched here.
- Email verification on profile email change — the app has no verification flow anywhere (registration doesn't verify either); adding one here would be new scope, not precedent-following.
- Session invalidation on password change — there's a single session cookie per login, not a multi-device session table to enumerate and revoke; out of scope.
- Un-deleting a category. Matches Accounts' own missing restore path.

## Decisions

**D1 — Category deletion is a hard delete, gated on zero usage — not archive, and not a forced reassignment flow.**
Unlike `Account`/`SavingsGoal`, `Category` has no status column (`AccountStatus`/`SavingsGoalStatus` exist; nothing analogous exists for `Category`), and this change does not add one. `CategoryService.delete` runs `prisma.transaction.count({ where: { categoryId } })` first; if `> 0`, it throws `AppError("CONFLICT", ...)` naming the count, and does not delete. Two alternatives considered and rejected:
- *Archive instead of delete* (mirroring Accounts/SavingsGoals): categories carry no balance or progress that would make "exists but hidden" meaningfully different from "gone" — rejected on the same grounds as before, this isn't about the blocking behavior.
- *Auto-reassign referencing transactions to a per-user "Uncategorized" category* on delete, preserving the originally-proposed UX: rejected as bigger, riskier scope for this change — it needs a get-or-create-Uncategorized-category helper, a guard so *that* category can never itself be deleted while anything points to it (same constraint one level removed), and a way to communicate to the user that a new category was silently created on their behalf. Blocking is simpler, safer, and gives the user visibility and control over where their transaction history ends up (a manual reassign via the Transactions screen), at the cost of one extra step before an in-use category can be removed.

**D2 — The delete confirmation dialog fetches the in-use count on open and gates the action on it, rather than letting the delete request fail on submit.**
`DeleteCategoryDialog` calls `getCategoryUsageCountAction` when opened. `count === 0`: normal delete confirmation. `count > 0`: the dialog shows "N transactions reference this category — reassign them on the Transactions screen first" and offers no delete action, since `CategoryService.delete` would reject it anyway (D1) — failing fast in the UI avoids a round-trip to discover what the count already tells us upfront.

**D3 — `CategoryService.update` allows re-parenting (`parentCategoryId`) and validates against the same self-referential misuse `create` already guards against.**
`create` calls `getOwnedCategoryOrThrow` on a provided `parentCategoryId` (must belong to the same user). `update` reuses that check, plus rejects setting a category as its own parent (`parentCategoryId === categoryId`) — the one cycle-forming case possible at one level of nesting, which is all the schema supports (no self-referential depth limit exists or is needed beyond that, since `Category.parentCategoryId` is a single flat self-relation, not a tree walked at write time elsewhere in the codebase).

**D4 — `AuthService.updateProfile` reuses `registerSchema`'s email rule via a new partial schema, not a hand-rolled one.**
`updateProfileSchema = registerSchema.pick({ name: true, email: true }).partial()`, so the format/casing rule for email never drifts between register and edit-profile. The uniqueness check (`prisma.user.findUnique({ where: { email } })`, reject if a match exists with a different `id`) mirrors `AuthService.register`'s existing duplicate check.

**D5 — `AuthService.changePassword` requires the current password, verified with the same `verifyPassword` used at login, before hashing the new one.**
No "forgot password" / reset-token flow is introduced — this is strictly "I'm logged in and know my current password." `newPassword` reuses `registerSchema.shape.password` (min 8, max 200) via `registerSchema.pick({ password: true })`.

**D6 — Route shape mirrors Accounts: `PATCH /api/categories/[categoryId]` for update, `DELETE /api/categories/[categoryId]` for delete; `PATCH /api/auth/profile` and `POST /api/auth/change-password` for the two auth additions.**
Categories' new route sits alongside the existing `src/app/api/categories/route.ts` (GET/POST unchanged). Auth has no existing `[id]`-style resource route to mirror since a user only ever acts on themselves — `/api/auth/profile` and `/api/auth/change-password` follow the existing flat `/api/auth/{login,register,logout}` shape instead.

**D7 — `/settings` is one server page with two independent client sections (`ProfileSection`, `CategoriesSection`), each with its own server actions — not a shared form or shared state.**
Matches this codebase's established pattern: server page fetches everything needed (`AuthService.getCurrentUser()`, `CategoryService.list()`), passes down to client components that own their own dialogs/`useActionState` forms, same shape as every other screen (Accounts, Investments, Savings Goals). No cross-section coordination is needed since Profile and Categories don't share data.

## Risks / Trade-offs

- **[Risk]** Changing email with no verification step means a typo silently locks the user out of future logins with no recovery path (no password-reset-via-email flow exists either). → **Mitigation**: this mirrors registration's existing behavior exactly (also unverified); not a regression introduced by this change, and out of scope to fix here (would require adding email delivery, which doesn't exist anywhere in the app yet).
- **[Risk]** The in-use `count()` on delete adds a query that isn't indexed by `categoryId` specifically. → **Mitigation**: bounded by one user's transaction volume (already scoped via the existing `[userId]` index in the query plan's leading filter), acceptable at this app's scale (PRD §32 targets ~500ms on development-scale usage).
- **[Trade-off]** No un-delete for categories, no un-archive precedent to follow even if wanted. → Accepted, matches Accounts' identical limitation.

## Open Questions

None outstanding. The original open question from exploration (silent delete vs. informative confirmation) became moot once implementation revealed deletion of an in-use category is blocked outright by a DB constraint (see Context) rather than silently absorbed — resolved with the user in favor of blocking (D1), with the confirmation dialog surfacing that upfront (D2).
