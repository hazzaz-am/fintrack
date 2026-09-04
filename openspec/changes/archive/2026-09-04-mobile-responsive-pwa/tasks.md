## 1. PWA foundation

- [x] 1.1 Generate a placeholder icon set (192, 512, maskable, apple-touch-icon) — implemented as Next.js 16 code-generated icon routes (`src/app/icon.tsx`, `apple-icon.tsx`, `icon-512/route.ts`, `icon-maskable/route.ts`) via `next/og` `ImageResponse` rather than static files under `public/icons/`, per the file-based Metadata API being the idiomatic path for this Next version
- [x] 1.2 Create the manifest with `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`, and the icon entries — implemented as `src/app/manifest.ts` (Next's dynamic manifest convention) rather than a static `public/manifest.json`
- [x] 1.3 Add `export const viewport: Viewport` to `src/app/layout.tsx` (width=device-width, initial-scale=1, themeColor); manifest/icon/apple-icon `<head>` tags are auto-injected by Next from the file conventions above, no manual linking needed
- [x] 1.4 Write a minimal hand-rolled service worker (`public/sw.js`) that precaches the app shell/static assets on install, serves them cache-first, and deletes stale caches on activate
- [x] 1.5 Register the service worker from a small client component mounted in the root layout, guarded to only run in production/HTTPS contexts
- [x] 1.6 Verify data-fetching routes are never answered from the service worker cache (network-only or explicitly excluded), and add a basic offline fallback state for data routes — `/api/*` is never intercepted by the SW, and navigations fall back to `public/offline.html` when the network fetch fails
- [x] 1.7 Verified installability signals against a real production build (`bun run build && bun run start`) via the gstack `/browse` headless browser: `/manifest.webmanifest` serves valid JSON with all required fields, `/icon`, `/icon-512`, and `/icon-maskable` all render correctly (dark square, gold "F", maskable variant has proper safe-zone padding), the service worker registers and becomes `active` on first load, and killing the server then reloading confirms the offline fallback (`public/offline.html`) renders instead of a broken connection — full Lighthouse run not performed, but every signal it would check was verified directly

## 2. Shell & navigation

- [x] 2.1 Verified the sidebar's mobile `Sheet` collapse and header at 375–430px widths — shadcn `Sidebar`/`useIsMobile` already handles this correctly; no changes needed
- [x] 2.2 Verified sidebar behavior at the 600–767px tablet zone — the 768px `useIsMobile` cutoff is a clean binary switch (Sheet below, rail above), no in-between breakage

## 3. Dashboard

- [x] 3.1 Verified metric card grids and the hero balance card at 375px width in `src/app/(app)/dashboard/page.tsx` — `grid-cols-2` base is intentional and fine (values wrap, never clip); **fixed** the page header (title+description vs. "Record transaction" button) to stack vertically below `sm` instead of squeezing horizontally (`flex-col ... sm:flex-row sm:justify-between` + `shrink-0` wrapper on the button)
- [x] 3.2 Verified `TrendChart` and `CategoryBreakdownChart` — both already use shadcn's `ChartContainer` (Recharts `ResponsiveContainer` under the hood) with `w-full`, and the breakdown chart's legend list already truncates category names and shrinks the pie chart to a fixed max-size on narrow screens; no changes needed

## 4. Transactions

- [x] 4.1 Changed `transaction-filters.tsx`'s field grid from `grid-cols-2 md:grid-cols-4` to mobile-first `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — **live-browser QA caught a real bug here**: the Search field's `col-span-2` (correct at the `sm`/`lg` breakpoints) forced the grid to implicitly grow to 2 columns even at the 1-column mobile base, since a span-2 item can't fit in a 1-column explicit grid — this re-broke every field into 2-up pairs, worse than the original layout. Fixed by making it `sm:col-span-2`. Confirmed via `/browse`: computed `grid-template-columns` went from `116px 177px` (broken, 2 columns) to a single `309px` track after the fix; screenshot confirms every field now stacks full-width at 375px.
- [x] 4.2 Verified `TransactionTable` (ListRow-based) rows at 375px width — `ListRow`'s `min-w-0 flex-1` + `truncate` on title/subtitle and `shrink-0` on icon/trailing already prevents clipping/overflow; **fixed** the page header (title+description vs. "Record transaction" button) to stack vertically below `sm`
- [x] 4.3 Verified the record/edit transaction drawers at 375px width — `DrawerContent` is already `inset-x-0` full-width with capped height on the y-swipe axis, and the form fields use the default (single-column) `FieldGroup`; no changes needed

## 5. Accounts

- [x] 5.1 Verified account list rows and balances at 375px width — ListRow-based, no changes needed; **fixed** the page header to stack vertically below `sm`
- [x] 5.2 Verified create/edit account form/drawer at 375px width — default single-column `FieldGroup` inside a full-width Drawer; no changes needed

## 6. Expenses

- [x] 6.1 Verified expense list and filter controls at 375px width — `RecentTransactionsList` is ListRow-based and `PeriodSelectForm` already uses `flex flex-wrap`; **fixed** the page header to stack vertically below `sm`
- [x] 6.2 Verified expense entry form/drawer at 375px width — shares `RecordTransactionDialog`, already confirmed fine (4.3)

## 7. Income

- [x] 7.1 Verified income list and filter controls at 375px width — same shared components as Expenses; **fixed** the page header to stack vertically below `sm`
- [x] 7.2 Verified income entry form/drawer at 375px width — shares `RecordTransactionDialog`, already confirmed fine (4.3)

## 8. Investments

- [x] 8.1 Verified investment card/list layout at 375px width — card grid is mobile-first (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`), card header uses `min-w-0` to prevent title overflow; **fixed** the page header to stack vertically below `sm`, and made the card footer (`Contribute`/`Record maturity` buttons) `flex-wrap` so it wraps instead of squeezing on the narrowest phones
- [x] 8.2 Verified contribute and record-maturity dialogs/drawers at 375px width — default single-column `FieldGroup` inside a full-width Drawer; no changes needed

## 9. Recurring transactions

- [x] 9.1 Verified recurring template list and the Due Recurring widget at 375px width — both ListRow-based/card-grid-based and already mobile-first; **fixed** the page header to stack vertically below `sm`
- [x] 9.2 Verified create/edit recurring transaction form at 375px width — default single-column `FieldGroup` inside a full-width Drawer; no changes needed

## 10. Reports

- [x] 10.1 Fixed the Tabs list (summary/accounts/investments) at 375px width — wrapped `TabsList` in a horizontally-scrollable container (`overflow-x-auto` with a full-bleed negative margin below `sm`) since "Monthly summary" + "Account balances" + "Investments" was borderline-too-wide for a 375px viewport; it now scrolls instead of overflowing the page
- [x] 10.2 Verified each tab's metric card grid at 375px width — same `grid-cols-2` pattern as Dashboard, already fine

## 11. Savings goals

- [x] 11.1 Verified savings goal list/progress display at 375px width — mobile-first grid, `CardFooter` already has `flex-wrap`; no changes needed
- [x] 11.2 Verified create/contribute savings goal form/drawer at 375px width — default single-column `FieldGroup` inside a full-width Drawer; no changes needed

## 12. Settings

- [x] 12.1 Verified Profile section layout at 375px width — `grid gap-4 md:grid-cols-2` (1-column on mobile); no changes needed
- [x] 12.2 Verified Categories section at 375px width — the one real `<table>` in the app, but shadcn's `Table` already wraps it in `overflow-x-auto` and content (name + two icon buttons) is narrow enough not to need it in practice; no changes needed

## 13. Auth

- [x] 13.1 Verified login form at 375px width — `(auth)/layout.tsx` already centers a `w-full max-w-sm` column with `px-4`, single-column `FieldGroup`; no changes needed
- [x] 13.2 Verified register form at 375px width — shares the same layout and form pattern as login; no changes needed

## 14. Verification & QA

- [x] 14.1 Used the gstack `/browse` headless browser (chrome-devtools/playwright MCP were unavailable, but `/browse` worked) to screenshot every route at 375px against a live dev server, logged in as a throwaway local QA account (`qa-tester@example.test`, local Postgres dev DB only): dashboard, transactions (+ filters), accounts, income, expenses, investments, recurring-transactions, savings-goals, settings, login, register, plus the mobile sidebar Sheet
- [x] 14.2 Reviewed every screenshot — one real bug found and fixed (the `col-span-2` grid issue documented under 4.1). Every other screen matched the reasoning-based assessment: headers stack correctly, no horizontal overflow anywhere (`document.documentElement.scrollWidth === clientWidth` confirmed on Reports), sidebar Sheet opens as a proper overlay with all nav items reachable, empty states and populated states (one account, BDT 15,000 balance) both render cleanly
- [x] 14.3 Ran `bun run lint` (clean aside from two pre-existing, unrelated errors in `carousel.tsx`/`use-mobile.ts`), `bun run build` (compiles; all new icon/manifest routes statically prerendered after adding `export const dynamic = "force-static"` to the two hand-written route handlers), and `bun run test` (85/85 passing)
- [x] 14.4 Verified against a real production build (`bun run start`): service worker registers and reaches `active` state, `caches.open('fintrack-shell-v1')` shows `offline.html` + static chunks cached, and killing the server then reloading serves the offline fallback page instead of a connection error — confirms the installability/offline mechanics end-to-end. Did not test the literal OS "Add to Home Screen" UI prompt (needs a real device or Chrome's install-banner UI, not exposed through the headless CDP surface used here).

## 15. Follow-up (not blocking this change)

- [x] 15.1 Noted in `proposal.md`/`design.md` that the PWA icon (dark square, gold "F" monogram, code-generated) is a placeholder pending real FinTrack branding; swapping it later only touches the four icon route files, not the manifest or layout
