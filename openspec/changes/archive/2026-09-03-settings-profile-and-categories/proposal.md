## Why

The Settings screen is the one unbuilt page from PRD §26.8 — `nav-config.ts` has carried `{ label: "Settings", href: "/settings", enabled: false }` since `web-app-foundation` first scaffolded the shell. Two of its six listed sections (Profile, Categories) are real, low-risk gaps with no open design questions: `AuthService` has never had a way to edit a user's own name/email/password since registration, and `CategoryService` has only ever supported `create`/`list` — there is no way to rename a mis-typed category or remove one that's no longer used, even though the display layer (`AnalyticsService`, the transactions table) already anticipates a category going away and falls back to "Uncategorized"/"—" for it. That fallback path exists today but nothing can currently trigger it.

The other four Settings sections (Currency, Theme, Account types, Data export/import) are deliberately excluded here — each turns out to need its own prior decision or is already Phase 2 (see Impact).

## What Changes

- Add `AuthService.updateProfile(userId, { name?, email? })`, reusing `registerSchema`'s email format/uniqueness rules (case-insensitive, trimmed, must not collide with another user's email).
- Add `AuthService.changePassword(userId, { currentPassword, newPassword })`, verifying `currentPassword` against the stored hash before rehashing, reusing `registerSchema`'s password rule (min 8, max 200).
- Add `CategoryService.update(userId, categoryId, { name?, icon?, parentCategoryId? })`, scoped to the owning user.
- Add `CategoryService.delete(userId, categoryId)`, scoped to the owning user. No default-vs-custom protection — seeded default categories are ordinary owned rows, deletable like any other custom one, by original design (`category-service.ts`'s existing comment). **Deleting a category still referenced by any transaction is rejected**, not silently absorbed — a DB-level CHECK constraint (`transactions_type_shape_check`, from `core-financial-architecture`) requires every INCOME/EXPENSE transaction to keep a non-null category, so an in-use category can never be orphaned; the user must reassign those transactions to a different category first (see design.md Context/D1 for how this was discovered and decided). Deleting a parent category still orphans its children to top-level (`parentCategoryId` → `null`, unaffected by that constraint) — no children are deleted.
- Add a `/settings` screen with two sections: Profile (edit name/email, change password) and Categories (list, rename, delete, create — reusing the existing `create`/`list` capability that today only has an API route and no UI).
- Flip `nav-config.ts`'s Settings entry to `enabled: true`.

## Capabilities

### New Capabilities
- `settings-ui`: The `/settings` screen — Profile section (edit name/email, change password) and Categories section (list/create/rename/delete), following the existing server-page → client-list → form-dialog → server-action pattern used by every other screen in the app.

### Modified Capabilities
- `user-auth`: Adds Profile Update and Change Password as new requirements alongside the existing Registration/Login/Logout/Authorization requirements.
- `categories`: Adds Category Update and Category Deletion as new requirements alongside the existing Default Categories/Custom Category Creation/Category Type Enforcement requirements.

## Impact

- **Code**: `src/lib/services/auth-service.ts`, `src/lib/services/category-service.ts`, `src/lib/validation/auth.ts` (new update-profile/change-password schemas), `src/app/api/categories/[categoryId]/route.ts` (new, PATCH/DELETE — mirrors the pattern of other resources' `[id]` routes), `src/app/(app)/settings/**` (new screen), `src/app/(app)/nav-config.ts` (flip `enabled`). `src/lib/services/analytics-service.ts` was investigated (a suspected "excludes orphaned-category transactions" gap) and found moot — see design.md Context for why — left unchanged.
- **No schema migration.** No new Prisma fields or tables — `Category` gets no status/archived column; hard delete is sufficient because the orphan-handling already exists.
- **No breaking changes** — `CategoryService.create`/`.list` and `AuthService.register`/`.login`/`.logout`/`.getCurrentUser` are unchanged; this is additive.
- **Explicitly not addressed by this change** (left as separate follow-ups, per exploration):
  - **Currency**: `User.defaultCurrency` is currently a dead field — every screen derives its displayed currency from `accounts[0].currency` instead. Making a Currency setting meaningful requires first deciding whether it's a cosmetic new-account-form default or a true display/reporting currency (which would need an exchange-rate model that doesn't exist anywhere in the app). That decision is out of scope here.
  - **Theme**: explicitly deferred to Phase 2 by the original `web-app-foundation` proposal; light/dark CSS tokens exist but no toggle mechanism does.
  - **Data export/import**: zero existing code in either direction, and the PRD is internally inconsistent about whether export is MVP (§30) or Phase 2 (§36) — needs that resolved before scoping a change.
  - **Account types**: not user-owned data — a hardcoded Zod enum (`accountTypeSchema`) matching PRD §8's example list. Nothing to build unless it's deliberately turned into user-editable data, which is its own decision.
