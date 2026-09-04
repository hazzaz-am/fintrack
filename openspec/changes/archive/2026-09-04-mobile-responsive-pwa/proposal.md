## Why

FinTrack has no dedicated mobile pass and no PWA infrastructure at all — no manifest, icons, viewport meta, or service worker. Recent commits have already been chipping at mobile polish (sidebar overlap, drawer-instead-of-modal forms, dialog overflow), but coverage is inconsistent: some screens are close to mobile-ready, others (multi-field filter forms, several unaudited pages) are not. The goal is to finish that pass systematically across every screen, and make the app installable to a phone home screen as a standalone app shell.

## What Changes

- Add `export const viewport` (width/theme-color) to `src/app/layout.tsx`.
- Add `public/manifest.json` (name, short_name, icons, start_url, display: standalone, theme/background color) and link it from the root layout.
- Add an icon set (192, 512, maskable variant, apple-touch-icon) to `public/`. **Assumption**: no FinTrack brand mark exists yet; a placeholder icon (e.g. wordmark/monogram) will be generated for this change and can be swapped later without touching the manifest structure.
- Add a minimal service worker (no external dependency required — hand-rolled, or `next-pwa`/`serwist` if it proves simpler) that caches the static app shell and JS/CSS assets only. **Explicitly out of scope**: caching or replaying transaction/account/balance data, background sync, or any offline write path — this is a finance app and stale/conflicting offline numbers are a correctness risk, not just a UX one. Offline visits to data routes should show an explicit "you're offline" state, not stale cached numbers.
- Register the service worker client-side and verify Lighthouse's installability checks pass.
- Audit and fix responsive layout across every route at phone widths (375–430px) and the tablet zone (600–767px): dashboard, transactions (incl. filters), accounts, expenses, income, investments, recurring-transactions, reports, savings-goals, settings, and auth (login/register).
- Known concrete fix: `transaction-filters.tsx`'s `grid-cols-2 md:grid-cols-4` (8 fields) needs a true mobile-first single-column layout before widening at larger breakpoints, not a 2-up cramped default.
- Verify (not necessarily change) screens that already have mobile-aware patterns: the shadcn sidebar's Sheet collapse, ListRow-based data lists (no `<table>` overflow issue), and the modal→drawer form conversions from a recent commit.

## Capabilities

### New Capabilities
- `pwa`: manifest, icon set, viewport/theme-color metadata, and an app-shell-only service worker that makes FinTrack installable as a standalone PWA without touching how live data is fetched or cached.

### Modified Capabilities
- `web-app-shell`: shell (sidebar/header) must be confirmed usable at phone widths and expose the PWA viewport/theme-color metadata; no navigation structure changes.
- `dashboard-ui`: metric card grids and chart cards must remain legible without horizontal scroll or cramped text at phone widths.
- `transactions-ui`: filter form must be usable single-column on a phone; transaction list/detail rows verified at phone widths.
- `accounts-ui`: account list and forms usable at phone widths.
- `expenses-ui`: expense list and forms usable at phone widths.
- `income-ui`: income list and forms usable at phone widths.
- `investments-ui`: investment cards/list and forms usable at phone widths.
- `recurring-transactions`: recurring template list and forms usable at phone widths.
- `reports-ui`: tabbed report grids and charts usable at phone widths without overflow.
- `savings-goals-ui`: savings goal list and forms usable at phone widths.
- `settings-ui`: settings sections usable at phone widths.
- `auth-ui`: login/register forms usable at phone widths.

## Impact

- **Code**: `src/app/layout.tsx` (viewport export, manifest link, SW registration), new `public/manifest.json` + icon files, new service worker file, and targeted className/layout fixes across the route files under `src/app/(app)/**` and `src/app/(auth)/**` plus their shared components (e.g. `transaction-filters.tsx`).
- **Dependencies**: none required (hand-rolled SW is preferred to avoid adding `next-pwa`/`serwist`, but design.md will confirm this trade-off).
- **No API, schema, or data-layer changes** — this is presentation-layer only.
- **Verification**: browser-based breakpoint QA is needed during implementation; note that `chrome-devtools` and `playwright` MCP servers failed to connect in the exploration session — implementation should use the gstack `/browse` skill or retry those MCP connections.
