## Context

FinTrack's web app is a Next.js app using shadcn/ui components, Tailwind v4 (`@theme inline` token mapping in `src/app/globals.css`), and Recharts for charts. The shell is a conventional sidebar dashboard (`SidebarProvider` + `AppSidebar` + `SidebarInset`, `src/app/(app)/layout.tsx`). The current theme is a blue/purple oklch palette with light/dark parity already wired through `.dark` class overrides.

The user supplied four mobile-app reference screenshots (Saving Goals, Statistics, Budgets — light and dark) and, during exploration, made four binding decisions:
1. Keep the sidebar shell; restyle it (no bottom nav).
2. Black is the primary functional color; mustard yellow is a rare accent (hero cards, active states only).
3. Recreate the reference's diagonal hatch-pattern bar fill, scoped to hero-card bar charts only.
4. Do the whole app in one change, not a phased rollout.

This design translates those decisions into concrete tokens, component changes, and a page-by-page mapping.

## Goals / Non-Goals

**Goals:**
- Replace the color/shape design language app-wide with the reference's cream/near-black neutrals, black-primary/yellow-accent hierarchy, and pill/rounded shape system, in both light and dark mode.
- Introduce the two missing shared UI primitives the reference relies on (segmented control, list-row pattern) so every page composes them instead of hand-rolling similar markup.
- Recreate the hero-card hatch-fill bar chart texture as a reusable Recharts pattern.
- Preserve every existing functional requirement (data shown, navigation, actions) exactly as specced today.

**Non-Goals:**
- No new features, routes, or data-model changes.
- No bottom nav / mobile-app shell — the reference's navigation chrome is not being copied, only its surface styling.
- No change to `--chart-1..5` semantic usage for non-hero charts (category breakdown pie, any future line charts) beyond retuning their actual color values to fit the new palette.
- No accessibility regression: contrast ratios must still meet WCAG AA even though the new palette is more saturated (yellow-on-cream, yellow-on-black) than the current blue theme.

## Decisions

### D1: Token replacement, not a new token layer
Reuse the existing token names in `src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--accent`, `--card`, etc.) and change only their oklch values, plus add new tokens for the yellow accent (`--highlight` / `--highlight-foreground`) since neither `--primary` nor `--accent` should carry it (per the black-primary/yellow-rare-accent decision — reusing `--accent` for yellow would make every `accent`-styled element yellow, which is wrong per D-color-hierarchy).
- Light: `--background`/`--card` ≈ warm cream (`oklch` equivalent of `#F3F0E7`), `--foreground` ≈ near-black.
- Dark: `--background`/`--card` ≈ near-black (`#141414`-ish), `--foreground` ≈ warm off-white.
- `--primary`/`--primary-foreground` ≈ black/white in light mode, inverted (white/black) in dark mode — matching the reference's solid pill buttons in both themes.
- New `--highlight`/`--highlight-foreground`: mustard yellow (`#F5C518`–`#FFC93C` range) / near-black text, identical in light and dark mode (the reference uses the same yellow in both).
- `--positive`/`--negative`/`--warning` (transaction sign, over-allocation, maturity) stay as distinct semantic tokens — they're unrelated to the brand accent and already documented as a presentation-layer mapping (see the existing comment above `:root` in `globals.css`).
- `--chart-1..5` retuned to sit on the new neutrals (still used by category-breakdown's pie `Cell`s and any solid-fill chart), but chart series color is out of scope for the hatch decision.

**Alternative considered:** Introduce a parallel token set (`--brand-*`) instead of overwriting `--primary`/`--accent`. Rejected — every shadcn component already consumes `--primary`/`--accent`/`--card` by name; overwriting in place means Button/Card/Badge/Progress restyle for free, while a parallel set would require touching every component's class list twice (once to remove old tokens, once to add new ones).

### D2: New `--highlight` token, not a repurposed `--accent`
Shadcn's `--accent` is used broadly today (hover states, subtle backgrounds) — repurposing it as "the mustard yellow" would make yellow appear in dozens of incidental places (hover backgrounds, disabled states) that the reference never colors. A dedicated `--highlight` token, applied deliberately only where design.md's page mapping (D5) calls for it, keeps yellow rare by construction rather than by developer discipline.

### D3: Segmented control and list-row as new shadcn-style primitives
Neither exists in `src/components/ui/`. Build them as new files in that directory, following the existing shadcn pattern (Radix primitive + `cva` variants where applicable) so they compose the same way as `Tabs`/`ToggleGroup` already do — a segmented control is close enough to `ToggleGroup` semantically (single-select, two options) that it should wrap `ToggleGroup` rather than reinvent keyboard/ARIA handling. The list-row is presentational only (icon badge slot, title/subtitle slot, trailing slot, optional bottom progress-bar slot) with no new interaction semantics — a plain composed component, not a Radix wrapper.

**Alternative considered:** Style `Tabs` directly for the segmented control instead of `ToggleGroup`. Rejected — `Tabs` implies routed/panel content switching semantics; the reference's Income/Expense switch just toggles which dataset a chart shows, which is closer to a single-select toggle group.

### D4: Hatch-fill pattern as an SVG `<pattern>` def, scoped to hero-card bar charts
Recharts renders to SVG, so a `<defs><pattern id="hatch-fill" patternUnits="userSpaceOnUse" ...><path .../></pattern></defs>` with diagonal lines, referenced as `fill="url(#hatch-fill)"` on `<Bar>`, is the direct way to get the reference's texture without a new charting library. Add this as a small reusable component (e.g. `<HatchPattern id=".." color=".." />`) exported from `src/components/ui/chart.tsx` alongside the existing `ChartContainer`/`ChartTooltip` helpers, so any bar chart placed on a hero card can opt in with one extra element + one `fill="url(#...)"` prop change. Non-hero bar charts keep `fill="var(--color-x)"` untouched.

Concretely: `TrendChart` (`src/components/analytics/trend-chart.tsx`) is the only existing bar chart in the codebase today (income/expense bars) and is Dashboard's closest match to the reference's Statistics-screen chart — it's the one that moves onto a `--highlight` hero card with the hatch fill applied to its bars. `category-breakdown-chart.tsx` uses `<Cell>` fills on what is a pie/donut shape, not a bar — it stays solid regardless of where it's placed.

**Alternative considered:** A pre-rendered hatch texture image as a CSS `background-image` behind solid bars. Rejected — bars are dynamically sized/positioned by Recharts per data point; an SVG pattern scales with the bar's own geometry, a background image would require pixel-matching bar rects manually.

### D5: Page-to-reference-pattern mapping
No new pages or routes. Each existing page adopts the closest reference layout pattern for its existing data, using the new primitives:

| FinTrack page | Reference pattern adopted | Notes |
|---|---|---|
| Dashboard | Statistics screen | Big balance stat, `--highlight` hero card wrapping `TrendChart` (hatched bars), Due Recurring / recent-transactions sections use the new list-row pattern |
| Savings Goals | Saving Goals screen | Total-saving stat, black "+ New" pill, 2-column grid of list-row-derived progress cards (icon badge + title/date + `$allocated/$target`) |
| Any budget/allocation-limit surface (e.g. category spend limits if present in Reports/Expenses) | Budgets screen | Progress-bar card with category pill tag + "% spent" + amount pair |
| Transactions, Accounts, Expenses, Income, Investments, Recurring Transactions | List-row pattern generally | Every "list of X with an amount" view converges on the same row anatomy (icon badge, title/subtitle, trailing amount) |
| Reports | Statistics-screen chart treatment | Existing analytics charts restyled to the new palette; hatch fill only if a bar chart ends up on a `--highlight` card there too |
| Settings | Shell-level restyle only | Forms/inputs get the new shape language (rounded, pill buttons) but Settings has no reference-equivalent screen among the four supplied |

This table is the working assumption for `tasks.md`; per-page detail (exactly which existing sections become list-rows) is implementation-level and doesn't need its own spec since no requirement text changes.

## Risks / Trade-offs

- **[Risk]** Yellow-on-cream and yellow-on-black may fail WCAG AA contrast for text if yellow is ever used as a text color instead of a background. → **Mitigation:** `--highlight-foreground` is fixed to near-black in both themes (never yellow-on-white text), and yellow is only ever a background/fill, never body text color, consistent with the reference.
- **[Risk]** Reusing `--primary`/`--accent` token names for a very different palette will visually break any page not yet reskinned mid-rollout (since this is one change, but tasks still land as a sequence of commits). → **Mitigation:** Land token + shell + shared-component changes first in the task sequence (per D1), so every page inherits the new look immediately rather than mixing old/new tokens across pages.
- **[Risk]** `ToggleGroup`-based segmented control may not visually match the reference's fully-pill, no-gap two-option switch without notable variant overrides. → **Mitigation:** Treat it as a new `cva` variant on top of existing `ToggleGroup`/`ToggleGroupItem`, not a visual carbon-copy requirement — acceptable since the underlying interaction (single-select toggle) is identical.
- **[Risk]** Hatch-pattern SVG fill could render inconsistently across browsers at small bar widths (aliasing). → **Mitigation:** Tune `patternUnits`/line spacing against the smallest expected bar width during implementation; fall back to solid fill if it's not legible at that size (non-blocking polish item, not a spec requirement).

## Migration Plan

No data migration. Deployment is a normal code change:
1. Land tokens (`globals.css`) + shell restyle + shared primitive updates (Button/Card/Badge/Progress) + two new components + hatch-pattern helper — this alone gets every page most of the way to the new look since they compose these primitives.
2. Land per-page layout adjustments (list-row adoption, hero-card placement, segmented-control adoption) page by page, in any order, since each page's changes are independent once step 1 is merged.
3. No feature flag — this is a visual-only change with no behavioral risk to gate; rollback is a normal revert of the token/component commits if the new look needs to be pulled.

## Open Questions

- Exact hex/oklch values for the cream background, near-black background, and mustard yellow — reference screenshots give approximate colors; final values should be picked/tuned during implementation and eyeballed against the screenshots rather than specified precisely here.
- Where do circular category/merchant icon badges get their icons from? FinTrack's categories (from `categories` capability) may or may not already carry an icon field — needs checking during implementation; if not, a default icon-by-category-name mapping or a neutral fallback badge is needed.
- Does any existing page actually have a "budget/spend-limit" concept matching the Budgets reference screen, or is that pattern only reachable via Reports' category breakdown? Confirm during task breakdown — if no such concept exists, the Budgets-screen pattern simply isn't used anywhere yet, which is fine (nothing forces every reference pattern to be used).
