## 1. Theme

- [x] 1.1 Choose accent color and semantic tokens (positive/income, negative/expense, warning) for light mode
- [x] 1.2 Define the same tokens for dark mode; verify contrast ratios against both backgrounds for accessibility (PRD §32)
- [x] 1.3 Replace the stock shadcn zero-chroma values in `src/app/globals.css` with the chosen tokens, including `--chart-1`..`--chart-5`
- [x] 1.4 Update `src/app/layout.tsx` metadata (title/description) to reflect FinTrack instead of `create-next-app` defaults

## 2. Auth pages (`(auth)` route group)

- [x] 2.1 Create `src/app/(auth)/layout.tsx`: redirect to `/accounts` if `getSessionUserId()` already resolves (spec: auth-ui — already-authenticated redirect)
- [x] 2.2 Create Server Action wrapping `AuthService` register flow, using `src/lib/validation/auth.ts`; on success calls `setSessionCookie` and redirects to `/accounts`
- [x] 2.3 Create Server Action wrapping `AuthService` login flow; same session/redirect behavior on success
- [x] 2.4 Build `src/app/(auth)/register/page.tsx`: form bound to the register action, field-level and duplicate-email error display
- [x] 2.5 Build `src/app/(auth)/login/page.tsx`: form bound to the login action, generic invalid-credentials error display (spec: auth-ui — do not distinguish wrong email vs. wrong password)

## 3. App shell (`(app)` route group)

- [x] 3.1 Create `src/app/(app)/layout.tsx`: call `getSessionUserId()`, `redirect('/login')` if absent (design.md D12 — no middleware)
- [x] 3.2 Build sidebar navigation covering full PRD §27 structure; only Accounts links to a real route, all other modules render visibly disabled with a "coming soon" affordance
- [x] 3.3 Add logout Server Action (clears session cookie, redirects to `/login`) and wire it to a shell control reachable from every page

## 4. Accounts screen

- [x] 4.1 Build `src/app/(app)/accounts/page.tsx` as a Server Component calling `AccountService.listWithBalances(userId)` directly (design.md D10 — no route-handler round trip)
- [x] 4.2 Render account list: name, institution, type, currency, status, derived balance; apply semantic color token to balance sign
- [x] 4.3 Build empty state for zero accounts, prompting account creation
- [x] 4.4 Create Server Action for account creation wrapping `AccountService.create`, using `src/lib/validation/account.ts`; `revalidatePath('/accounts')` on success
- [x] 4.5 Create Server Action for account edit wrapping `AccountService.update`
- [x] 4.6 Create Server Action for account archive wrapping `AccountService.archive`, gated behind a confirmation step in the UI
- [x] 4.7 Build create-account form/dialog with field-level validation error display
- [x] 4.8 Build edit-account form/dialog
- [x] 4.9 Build archive confirmation control

## 5. Root route

- [x] 5.1 Replace `src/app/page.tsx` boilerplate with a session-aware redirect: `/accounts` if authenticated, `/login` if not (design.md D14)

## 6. Verification

- [x] 6.1 Manual walkthrough: register → land on `/accounts` empty state → create account → see it listed with correct balance → edit it → archive it → confirm it disappears from the list
- [x] 6.2 Manual walkthrough: log out → confirm redirect to `/login` → confirm direct navigation to `/accounts` while logged out redirects to `/login`
- [x] 6.3 Confirm visiting `/login` or `/register` while already authenticated redirects to `/accounts`
- [x] 6.4 Confirm existing `tests/account-service.test.ts` and the rest of the suite still pass unmodified (this change adds no service-layer code)
- [x] 6.5 Check both light and dark token sets render with sufficient contrast for text, borders, and the three semantic colors
