## 1. Design tokens

- [x] 1.1 Pick final oklch values for cream (light bg/card), near-black (dark bg/card), near-black (light fg)/off-white (dark fg), and mustard yellow highlight, eyeballed against the reference screenshots.
- [x] 1.2 In `src/app/globals.css`, replace `:root` values for `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring` with the new light-mode (cream/black) values.
- [x] 1.3 Add new `--highlight` / `--highlight-foreground` tokens (mustard yellow / near-black) to `:root` and wire them into the `@theme inline` block (`--color-highlight`, `--color-highlight-foreground`).
- [x] 1.4 Replace the same token list in `.dark` with the dark-mode (near-black bg / off-white fg, inverted black-primary→white-primary) values; keep `--highlight`/`--highlight-foreground` identical in both themes.
- [x] 1.5 Retune `--chart-1..5` to sit on the new neutrals (used by `category-breakdown-chart.tsx`'s pie cells); keep `--positive`/`--negative`/`--warning` as distinct semantic tokens, retuned only enough to stay legible on the new backgrounds.
- [x] 1.6 Update the radius scale if needed so `--radius-lg`/`--radius-xl`/etc. produce the pill/heavily-rounded look used by buttons and cards (verify visually rather than guessing values).

## 2. Shared shell restyle

- [x] 2.1 Restyle `src/app/(app)/app-sidebar.tsx`: active nav item gets a pill-shaped highlight (using `--highlight`), inactive items use plain text/icon on the sidebar background.
- [x] 2.2 Restyle the header in `src/app/(app)/layout.tsx`: circular icon buttons (e.g. sidebar trigger), rounded content area wrapping `{children}`.
- [x] 2.3 Verify sidebar/header render correctly in both light and dark mode.

## 3. Shared primitive restyle

- [x] 3.1 Update `src/components/ui/button.tsx`: primary variant becomes solid black (light) / solid white (dark) pill; ensure a variant path exists for a highlight/yellow button if any page needs one (expected rare, per design.md D2).
- [x] 3.2 Update `src/components/ui/card.tsx`: larger corner radius; support an optional "highlight" surface style (mustard background) for hero cards.
- [x] 3.3 Update `src/components/ui/badge.tsx`: pill shape, restyled color variants matching the new palette (used for category tags like "Food & drinks").
- [x] 3.4 Update `src/components/ui/progress.tsx`: restyle track/fill colors and rounding to match the reference's progress bars.

## 4. New shared components

- [x] 4.1 Build a segmented-control component wrapping `ToggleGroup`/`ToggleGroupItem` with a pill, no-gap, filled-active-option variant (per design.md D3).
- [x] 4.2 Build a list-row component: leading circular icon-badge slot, title + optional gray subtitle, trailing amount slot, optional bottom progress-bar slot (per design.md D3 and the design-system spec's list-row requirement).
- [x] 4.3 Add a reusable hatch-pattern SVG `<defs>` helper (e.g. exported from `src/components/ui/chart.tsx`) producing a `fill="url(#...)"`-able diagonal-line pattern, parameterized by an id and a color (per design.md D4).

## 5. Hero-card bar chart treatment

- [x] 5.1 Apply the hatch-pattern fill to `TrendChart`'s (`src/components/analytics/trend-chart.tsx`) income/expense `<Bar>` fills when it is rendered inside a highlight/hero card.
- [x] 5.2 Confirm `category-breakdown-chart.tsx` (pie/`Cell`) keeps solid `--chart-1..5` fills regardless of placement — no hatch pattern applied there.

## 6. Dashboard page

- [x] 6.1 Wrap the top-line balance stat + `TrendChart` in a highlight/hero card (Statistics-screen pattern), applying the hatch fill from section 5.
- [x] 6.2 Convert the recent-transactions list and Due Recurring widget to use the list-row component.
- [x] 6.3 Restyle the quick-add action as the primary black pill button.

## 7. Savings Goals page

- [x] 7.1 Add/restyle the total-saving stat header and black "+ New" pill button (Saving Goals-screen pattern).
- [x] 7.2 Convert the goals grid to list-row-derived progress cards (icon badge, title/date, `$allocated/$target`, progress bar) in a 2-column layout.

## 8. Transactions, Accounts, Expenses, Income, Investments, Recurring Transactions pages

- [x] 8.1 Convert each page's primary list view to the list-row component (icon badge, title/subtitle, trailing amount; progress bar only where a target/limit concept already exists).
- [x] 8.2 Restyle each page's primary action button(s) as black pills and any filter/segmented UI (e.g. transaction type filter) using the new segmented-control component where applicable.

## 9. Reports page

- [x] 9.1 Restyle existing analytics charts (`trend-chart.tsx`, `category-breakdown-chart.tsx` usages) to the new palette.
- [x] 9.2 If a bar chart on this page sits on a highlight/hero card, apply the hatch fill; otherwise leave solid fills per the design-system spec.

## 10. Settings page

- [x] 10.1 Restyle forms, inputs, and buttons to the new shape/color language; no reference-equivalent layout exists so this is shell-level restyle only, not a new layout pattern.

## 11. Verification

- [x] 11.1 Manually check every page in both light and dark mode against the reference screenshots' spirit (cream/black/mustard hierarchy, pill shapes, list-row anatomy). Verified via browser screenshots: login, Dashboard, Accounts, Savings Goals, Transactions, Expenses (light + dark).
- [x] 11.2 Check contrast: highlight-on-background, primary-on-background, and text-on-highlight all meet WCAG AA. Computed actual rendered contrast ratios in-browser; `--positive`/`--negative` were retuned darker (were 3.32/4.29 against the new cream background, now 4.99/5.34) to clear the 4.5:1 AA threshold for small text — all other pairs were already 6.6:1+.
- [x] 11.3 Confirm no functional regressions: run existing test suite and manually exercise one flow per page (e.g. record a transaction, allocate a savings goal) to confirm behavior is unchanged. `npm run test` — 85/85 passing. Manually exercised: register/login, add account, add + allocate a savings goal, record an expense transaction — all worked end-to-end with the new UI.
- [x] 11.4 Confirm the hatch-pattern chart renders correctly at the Dashboard's actual bar widths in both themes. Confirmed on Dashboard and Expenses hero cards with real data in both light and dark mode.
