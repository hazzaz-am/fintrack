## Context

Continuing the numbering from the two archived design docs (`core-financial-architecture` D1–D5, `investment-tracking` D6–D9), which established: `Transaction`/`GoalAllocationEvent` as append-only ledgers with derived current state (D1, D2, D6, D7), a layered Next.js-only architecture where services are the sole enforcement point for business rules (D4), and session-cookie auth via `getSessionUserId()`/`requireAuth()` (D5). This design covers the first UI built on top of that backend: the authenticated shell, login/register, and the Accounts screen. Every decision here becomes the pattern the next four screens (Transactions, Savings Goals, Investments, Dashboard) inherit, so the bar is "would I be comfortable repeating this four more times," not "is this good enough to ship once."

`getSessionUserId()` (`src/lib/auth/session.ts`) reads cookies via `next/headers` and verifies an HMAC using Node's `crypto` module directly — it is not edge-runtime-safe as written. That constrains where the auth guard can live.

## Goals / Non-Goals

**Goals:**
- Establish one data-read pattern (Server Components calling services directly) and one mutation pattern (Server Actions calling the same services) that every future screen reuses without re-litigating the choice.
- Ship a working, navigable app: register → login → see accounts → create/edit/archive an account.
- Replace the stock shadcn neutral theme with a deliberate, accessible light+dark palette before any more screens are built against it.
- Keep the existing 23 route handlers under `src/app/api/**` fully intact and meaningful (reserved for client-side interactivity in later changes), not orphaned.

**Non-Goals:**
- Dashboard, Transactions, Savings Goals, Investments screens — each a follow-up change.
- Displaying goal-allocation breakdown ("Allocated" / "Available" per PRD §8 mockup) on the Accounts screen — that data belongs to the `savings-goals` capability and arrives with its own UI change, not retrofitted here.
- Dark-mode *toggle* control — token values are authored for both modes now (cheap to do once, expensive to retrofit), but no UI switches between them yet (PRD §36, Phase 2).
- `next.js` middleware / edge-runtime auth — deliberately avoided, see D12.

## Decisions

### D10 — Server Components call services directly for reads; Route Handlers stay reserved for client-driven interactivity

**Decision:** Pages under `(app)/**` are Server Components that call `AccountService` (and future services) directly — no `fetch('/api/...')` round-trip to the app's own API for the initial render. The 23 existing route handlers are unchanged and become the surface a Client Component calls *after* the page has rendered (e.g. a future Transactions table's search-as-you-type). This change adds no new route handlers.

**Alternatives considered:**
- *Route handlers as the only data path, Server Components fetch from them* — simpler mental model (one path for everything), but adds a same-process HTTP round-trip to every page load for no benefit, and duplicates response shaping that Server Components don't need (route handlers exist to serve a client fetch, not a server render).

**Consequence:** Two access paths now exist to the same services (direct call, and HTTP via route handler) for future screens that need both an initial render and post-load client interactivity. Both paths call the service, never duplicate its logic (D4 still holds).

### D11 — Server Actions for mutations, same thin-wrapper shape as Route Handlers

**Decision:** Forms use Server Actions (`'use server'` functions) that parse input with the existing Zod schemas (`src/lib/validation/*`), call `requireAuth()`, call the service, then `revalidatePath()`. This is line-for-line the same shape as the existing route handlers (`src/app/api/accounts/route.ts`) — parse → auth → service → respond — just returning a value to `useActionState` instead of a `NextResponse`.

**Alternatives considered:**
- *Client Components POST to the existing route handlers* — would work, but requires client-side fetch/loading/error state management (`useState` boilerplate) that Server Actions + `useActionState` handle natively with progressive enhancement (forms work before JS hydrates). Rejected as strictly more code for the same result.

**Consequence:** Business logic still lives only in services (D4 unchanged) — Server Actions and Route Handlers are two equally-thin entry points, never a place validation or accounting rules get duplicated or drift between.

### D12 — Auth guard lives in `(app)/layout.tsx`, not middleware

**Decision:** `(app)/layout.tsx` is an `async` Server Component that calls `getSessionUserId()` directly and `redirect('/login')` if it returns `null`. No `middleware.ts` is introduced.

**Alternatives considered:**
- *Next.js middleware* — the conventional place for auth redirects, but middleware runs on the Edge runtime by default, and `session.ts` calls Node's `crypto.createHmac`/`timingSafeEqual` directly (not edge-safe without a rewrite). Rewriting the session verifier to be edge-compatible, or opting middleware into the Node runtime (a Next 16 config surface that should be checked against `node_modules/next/dist/docs/` before relying on it, per this repo's `AGENTS.md`), is more change than a route-group layout guard for one screen. Revisit if a later change has a concrete reason (e.g. protecting static assets, or wanting the redirect before any Server Component render starts).

**Consequence:** The guard runs once per navigation into `(app)/**`, in the same Node runtime as the rest of the Server Components — no edge/node split to reason about. `(auth)/**` pages (login/register) do the inverse check: if already authenticated, redirect into the app instead of showing the form.

### D13 — Semantic color is a mapping onto existing computed fields, not new UI logic

**Decision:** The theme defines named tokens for positive (income/gains), negative (expense/loss), and warning (e.g. `isOverAllocated`, an overdue investment) states. Components consume these by reading fields the services already compute (`AccountWithBalance.balance` sign for now; `isOverAllocated`, `daysUntilMaturity` when Savings Goals/Investments ship) — never by re-deriving "is this good or bad" in a component with its own comparison logic. This continues the project's existing rule (design.md D3, D8: computed fields are a service concern) one layer up into presentation.

**Consequence:** When Savings Goals/Investments UI ships, the warning-state styling is already defined — those changes wire an existing token to an existing field, not invent new color logic.

### D14 — Root `page.tsx` becomes a session-aware redirect

**Decision:** `src/app/page.tsx` (currently the `create-next-app` boilerplate) becomes a Server Component that checks `getSessionUserId()` and redirects to `/accounts` if present, `/login` if not. `/accounts` (not `/dashboard`) is the authenticated landing page for this change, since Dashboard doesn't exist yet — revisit the landing target when the Dashboard change ships.

## Risks / Trade-offs

- **[Risk]** Two mutation entry points (Server Actions, Route Handlers) both wrapping the same service could drift if a future contributor adds a check to one and not the other → **Mitigation:** D4/D11 keep both deliberately thin; any new business rule goes in the service, never in an action or handler. Code review should treat logic in either entry-point file as a smell.
- **[Risk]** Hardcoded green/red/amber semantic tokens can fail contrast requirements against certain accent/background combinations, undermining the accessibility goal (PRD §32) → **Mitigation:** check contrast ratios for both light and dark token sets during the theme pass (tasks.md), not after.
- **[Trade-off]** Not using middleware (D12) means every `(app)/**` route pays a Server Component render start before the redirect fires, versus middleware's earlier interception → accepted; the app is small enough (hobby scale, PRD §32's ~500ms target) that this is not measurable, and avoids an edge-runtime rewrite of `session.ts` for no functional gain.

## Migration Plan

Additive only — no existing UI to migrate (the current `page.tsx` is unmodified boilerplate with no real usage).
1. Theme: replace `src/app/globals.css` tokens; update `src/app/layout.tsx` metadata.
2. `(auth)` route group: login, register pages + Server Actions wrapping `AuthService`.
3. `(app)/layout.tsx`: sidebar shell (full PRD §27 nav, non-Accounts links visually disabled/"coming soon" until their change ships) + auth guard + logout action.
4. `(app)/accounts`: list page (Server Component, direct `AccountService.listWithBalances` call) + create/edit/archive Server Actions + forms.
5. `src/app/page.tsx`: replace boilerplate with the D14 redirect.

## Open Questions

None outstanding — the two questions this design needed to settle (where the auth guard lives, D12; what the Accounts screen does and doesn't show, Non-Goals) are resolved above. The still-open question from `core-financial-architecture/design.md` (category default-seeding on registration) is unrelated to this change's scope and remains deferred to whichever change first needs Categories UI.
