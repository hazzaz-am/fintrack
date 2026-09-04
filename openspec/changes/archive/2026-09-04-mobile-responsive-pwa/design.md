## Context

FinTrack is a Next.js 16 / React 19 app (App Router, Tailwind v4, shadcn/ui) with no mobile-specific audit and zero PWA infrastructure (`public/` has only the default Next.js SVGs; `src/app/layout.tsx` has no `viewport` export, no manifest link, no service worker). Recent commits already moved several pieces toward mobile-friendliness incidentally:
- `src/components/ui/sidebar.tsx` (shadcn) already collapses to a `Sheet` below 768px via `useIsMobile` (`src/hooks/use-mobile.ts`).
- Data lists use `ListRow`-based markup, not `<table>`, avoiding the classic table-overflow problem.
- Multi-field forms were converted from centered modals to bottom `Drawer`s in a prior change.

What's missing is a systematic verification pass at phone widths (375–430px) and the 600–767px tablet zone, plus the entire PWA installability layer. This design covers both.

## Goals / Non-Goals

**Goals:**
- Every route renders without horizontal scroll, overlapping controls, or truncated-to-uselessness text at 375px width.
- The app is installable to a phone home screen (manifest + icons + standalone display) and launches without browser chrome.
- Static app-shell assets are cached by a service worker so the shell itself loads instantly on repeat visits.

**Non-Goals:**
- Offline reads or writes of financial data (balances, transactions). A finance app showing stale or conflicting numbers offline is a correctness risk, not a UX nicety — deferred indefinitely, not just out of scope for v1.
- Background sync, push notifications, or any other advanced PWA capability beyond installability.
- Redesigning navigation structure or introducing new mobile-only UI patterns (e.g., bottom tab bar) — the existing sidebar/Sheet pattern stays.
- Changing the underlying data-fetching or caching strategy for pages.

## Decisions

### 1. Hand-roll the service worker instead of adding `next-pwa`/`serwist`
Scope is intentionally tiny (cache the app shell + static assets, no runtime caching strategies, no offline data). A ~30-line hand-written `public/sw.js` registered from a small client component covers this without adding a dependency to a Next.js 16 app whose plugin compatibility with newer Next versions isn't guaranteed. If caching needs grow later (e.g., real offline support), that's the point to revisit `serwist`.

### 2. Viewport/theme-color via Next.js Metadata API, not a raw `<meta>` tag
Next.js App Router supports `export const viewport: Viewport` in `layout.tsx` for viewport and theme-color, which is the framework-idiomatic path (also lets `next build` warn on misconfiguration). Avoids hand-writing `<meta name="viewport">` tags that Next may deduplicate or conflict with.

### 3. Placeholder icon now, swappable later
No FinTrack brand mark exists yet. A generated monogram/wordmark icon (base 512×512, derived 192×192, maskable variant with safe-zone padding, and an apple-touch-icon) will be committed under `public/icons/`. The manifest references file paths, not inline assets, so swapping the actual artwork later is a file-replace with no manifest/code changes.

### 4. Fix layout at the source, not with a parallel mobile component tree
No `*.mobile.tsx` variants or client-side viewport branching for layout. All fixes are Tailwind responsive-prefix adjustments (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` etc.) to existing components, consistent with how the codebase already handles the dashboard/report grids. Keeps one render path per screen (important for the server-rendered pages here) and avoids layout-shift between a "mobile" and "desktop" tree.

### 5. Mobile-first single column for the transaction/report filter forms
`transaction-filters.tsx`'s `grid-cols-2 md:grid-cols-4` starts cramped (2-up) and widens. Flip to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` so the default (no breakpoint matched) is a single readable column, matching how an 8-field form should behave on a 375px screen.

## Risks / Trade-offs

- **[Risk]** No real device testing available in this environment (`chrome-devtools` and `playwright` MCP servers failed to connect during exploration). → **Mitigation**: use the gstack `/browse` skill for headless breakpoint screenshots during implementation; retry the MCP connections before starting; if neither works, fall back to manual QA instructions for the user to run locally.
- **[Risk]** A hand-rolled service worker can go stale and serve outdated JS/CSS after a deploy if cache invalidation isn't handled. → **Mitigation**: cache-bust by Next.js's own build-id-hashed asset filenames (already content-hashed by Next), and use a "stale-while-revalidate" or version-keyed cache name that's replaced (old caches deleted) on `activate`.
- **[Risk]** Placeholder icon ships to production and looks unfinished. → **Mitigation**: call this out explicitly in tasks.md as a follow-up item once real branding exists; the manifest/icon file structure won't need to change when it's swapped.
- **[Trade-off]** Touching 12 UI capabilities' spec files for what are often small className changes adds spec overhead relative to the code diff size. Accepted because the user explicitly chose the systematic, all-screens scope over a smaller triage pass.

## Open Questions

- Should the "offline" state for data routes show a full-page message or an inline banner over stale-but-visible layout chrome? Left to implementation-time judgment in tasks.md; low-stakes since it's an edge case (no offline caching of data means there's nothing stale to show either way).
