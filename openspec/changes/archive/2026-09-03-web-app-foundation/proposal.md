## Why

Five of FinTrack's six core modules (`user-auth`, `accounts`, `transactions`, `savings-goals`, `investments`) have complete, tested backends — services, validation, route handlers — but the app has zero screens. `src/app/page.tsx` is still the unmodified `create-next-app` boilerplate, and there is no way to reach the product except by calling API routes directly. Nobody can see the app work. This change builds the first real screens and, in doing so, establishes the frontend architectural pattern (data access, mutations, route structure, visual theme) that every subsequent screen will follow — so that decision only needs to be made once, deliberately, rather than drifting screen by screen.

## What Changes

- Add an unauthenticated `(auth)` route group with login and register pages, calling the existing `AuthService` via Server Actions.
- Add an authenticated `(app)` route group with a shared layout: sidebar navigation (per PRD §27: Dashboard, Accounts, Transactions, Income, Expenses, Savings Goals, Investments, Reports, Settings — non-functional links for modules built in later changes), a `requireAuth()` guard that redirects to `/login` when no session exists, and a logout action.
- Add the Accounts page (`(app)/accounts`): lists accounts with derived balances (`AccountService.listWithBalances`), and forms to create/edit/archive an account, all via Server Actions calling `AccountService` directly.
- Establish the frontend data pattern for this and all future screens: **Server Components call services directly for reads** (no HTTP round-trip through the app's own API), **Server Actions call the same services for mutations**. The existing 23 route handlers under `src/app/api/**` are unchanged and remain the surface for client-side interactivity added in later changes (e.g. a Transactions table's live search/filter/pagination) — this change does not modify or remove them.
- Replace the stock shadcn zero-chroma theme in `src/app/globals.css` with a deliberate palette: one accent color for primary actions/brand, and a semantic color mapping (positive/income/gains, expense/negative, warning) used consistently wherever the backend already exposes a computed signal that means one of those things (e.g. `isOverAllocated`, an overdue investment). Light and dark token sets are both authored now; a dark-mode *toggle* is out of scope (Phase 2 per PRD §36).
- Update `src/app/layout.tsx` (currently generic `create-next-app` metadata/title) to reflect the actual product.

## Capabilities

### New Capabilities
- `web-app-shell`: the authenticated route group's layout — sidebar navigation, auth guard/redirect behavior, logout, and the overall page chrome every future authenticated screen renders inside.
- `auth-ui`: login and register page behavior — form validation and error display, session creation on success, redirect targets, and the unauthenticated route group's relationship to the shell.
- `accounts-ui`: the Accounts screen's behavior — what's displayed per account (balance, status, allocation context), and the create/edit/archive interactions.

### Modified Capabilities
- (none — this change is purely additive UI; no existing backend requirement in `user-auth`, `accounts`, `transactions`, `savings-goals`, or `investments` changes.)

## Impact

- **New code**: `src/app/(auth)/login`, `src/app/(auth)/register`, `src/app/(app)/layout.tsx`, `src/app/(app)/accounts`, plus Server Action modules that wrap `AuthService`/`AccountService`.
- **Modified**: `src/app/globals.css` (theme tokens), `src/app/layout.tsx` (metadata), `src/app/page.tsx` (becomes a redirect to `/dashboard` or `/login` depending on session — the boilerplate content is removed).
- **Unchanged**: all existing services, validation, Prisma schema, and the 23 route handlers under `src/app/api/**` — this change adds a second, direct-call access path for Server Components without touching the HTTP API.
- **Out of scope**: Transactions, Savings Goals, Investments, and Dashboard screens (each a follow-up change); dark-mode toggle UI; any change to backend business logic.
