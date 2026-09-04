## Why

FinTrack's web app currently uses a generic shadcn dashboard look (blue/purple theme, default component styling) with no distinctive visual identity. The user has a reference mobile expense-tracker app whose UI/UX they want FinTrack's web app to adopt wholesale — not its features, only its look, feel, and interaction patterns (warm cream/near-black neutrals, a restrained black-primary + rare-mustard-accent color hierarchy, pill/heavily-rounded shapes, and a consistent list-row/card anatomy). Applying this now, before more pages accumulate ad-hoc styling, keeps the reskin a single coherent pass instead of a page-by-page drift.

## What Changes

- Replace the blue/purple oklch color theme in `src/app/globals.css` with a warm cream (light) / near-black (dark) neutral base, keeping full light/dark parity via the existing `.dark` class mechanism. **BREAKING** (visual only): existing `--primary`/`--accent` token consumers change appearance.
- Redefine the color hierarchy: black becomes the primary functional color (solid pill buttons, text, icon badges); mustard/gold yellow becomes a rare accent reserved for one hero surface per page, active segmented-control state, and active sidebar indicator — it is not a drop-in replacement for the old `--primary`.
- Restyle the shared app shell (`AppSidebar`, header in `src/app/(app)/layout.tsx`): pill-shaped active nav-item highlight, rounded content area, circular header action buttons.
- Restyle shared shadcn primitives to the new shape language: `Button`, `Card`, `Badge`, `Progress` (heavily rounded/pill corners, new color roles).
- Add new shared UI components that don't exist today:
  - A segmented-control / pill-toggle component (e.g. Income/Expense switch).
  - A list-row pattern component: circular icon badge + title/subtitle + trailing amount (optionally a bottom progress bar), used anywhere a list of transactions/goals/budgets/payments is shown.
  - A reusable diagonal hatch-pattern SVG fill for Recharts bar charts, applied only to bar charts on hero/accent-colored cards.
- Re-skin every existing page's page-specific layout to use the above (no functional/data changes): Dashboard, Transactions, Accounts, Expenses, Income, Investments, Reports, Savings Goals, Recurring Transactions, Settings.
- Existing charts outside hero cards (`trend-chart.tsx`, `category-breakdown-chart.tsx`) keep solid color fills; only hero-card bar charts get the hatch pattern.

This is a pure visual/interaction reskin. No feature, business logic, data model, or API behavior changes.

## Capabilities

### New Capabilities
- `design-system`: The shared visual design tokens (light/dark cream + near-black neutrals, black-primary/yellow-accent color hierarchy), shape language (pill/rounded components), and shared UI patterns (segmented control, list-row anatomy, hero-card hatch-fill chart pattern) that every page in the app must use.

### Modified Capabilities
<!-- No existing capability's functional/behavioral requirements change: dashboard-ui, accounts-ui, expenses-ui, income-ui, investments-ui, reports-ui, savings-goals-ui, settings-ui, transactions-ui, and web-app-shell all keep their current WHAT-is-shown and WHAT-is-navigable requirements unchanged. Only how those requirements are visually presented changes, which is governed by the new design-system capability. -->

## Impact

- `src/app/globals.css` — full token replacement (colors, radius scale already exists and stays).
- `src/app/(app)/layout.tsx`, `src/app/(app)/app-sidebar.tsx` — shell restyle.
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `progress.tsx` — shape/color updates.
- `src/components/ui/` — two new components (segmented control, list-row).
- `src/components/ui/chart.tsx`, `src/components/analytics/trend-chart.tsx`, `category-breakdown-chart.tsx` — new hatch-fill pattern definition, applied selectively.
- Every page under `src/app/(app)/**` — layout/markup updates to adopt new components and shape language; no route, data-fetching, or service-layer changes.
- No changes to `src/lib/services/**`, API routes, or the database schema.
