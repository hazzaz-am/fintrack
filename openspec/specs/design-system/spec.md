# design-system Specification

## Purpose
Defines the shared visual design system for the web app: theming (light/dark, warm neutral palette), the functional use of color (black as primary, yellow as a rare accent), shared shape language (pill/heavily-rounded components), the common anatomy for amount-bearing list rows, and the hatch-pattern treatment for bar charts on hero surfaces. This spec governs cross-cutting visual/UI conventions that apply across all pages and shared components, rather than the behavior of any single feature.

## Requirements

### Requirement: App supports light and dark theme with a warm neutral palette
The app SHALL render both a light theme (warm cream background/surfaces, near-black text) and a dark theme (near-black background/surfaces, warm off-white text), toggled via the existing theme mechanism, with no page-specific exceptions.

#### Scenario: User views the app in light mode
- **WHEN** the app is rendered in light mode
- **THEN** page backgrounds and card surfaces use the warm cream palette and body text uses the near-black foreground color, on every page

#### Scenario: User views the app in dark mode
- **WHEN** the app is rendered in dark mode
- **THEN** page backgrounds and card surfaces use the near-black palette and body text uses the warm off-white foreground color, on every page

### Requirement: Black is the primary functional color; yellow is a rare accent
Primary actions (the main call-to-action button on a page, e.g. "Add", "New", "Save") SHALL be rendered as a solid black (light mode) or solid white (dark mode) pill-shaped button with inverted text. A dedicated highlight color (mustard/gold yellow) SHALL be used only for: one hero surface per page at most, the active state of a segmented control, and the active item indicator in the sidebar navigation — it SHALL NOT be used as the default color of buttons, links, or icons elsewhere.

#### Scenario: Primary action button
- **WHEN** a page renders its primary call-to-action button
- **THEN** the button is a solid black pill (light mode) or solid white pill (dark mode) with inverted text, not the highlight color

#### Scenario: Hero surface uses the highlight color
- **WHEN** a page designates one surface as its hero card (e.g. a top summary/chart card)
- **THEN** that surface uses the highlight color as its background, and no other surface on the same page also uses the highlight color as a background

#### Scenario: Segmented control active state
- **WHEN** a segmented control's option is selected
- **THEN** the selected option is shown filled, and the highlight color is used only if the control is on a hero surface — otherwise the active option uses the primary (black/white) fill

### Requirement: Shared components use a pill/heavily-rounded shape language
Buttons, cards, tags/badges, and the segmented control SHALL use substantially rounded corners (pill-shaped for buttons, tags, and segmented controls; large-radius rounded corners for cards), consistently across every page, rather than the sharp/lightly-rounded corners of the prior theme.

#### Scenario: Button corner radius
- **WHEN** any button in the app is rendered
- **THEN** its corner radius is large enough that the shape reads as a pill (fully rounded ends) rather than a rectangle with slightly rounded corners

#### Scenario: Card corner radius
- **WHEN** any card-style container is rendered
- **THEN** its corner radius is visibly larger than the prior theme's default card radius

### Requirement: List rows share a consistent icon-badge/title-subtitle/trailing-amount anatomy
Any list of items that each have a name and a monetary amount (transactions, recurring templates, savings goals, upcoming payments, budget/category entries) SHALL render each item as a row with: a leading circular icon badge, a title with an optional gray subtitle beneath it (e.g. a date), and a trailing amount aligned to the right — optionally with a progress bar beneath the row when the item has a target/limit.

#### Scenario: List row without a progress target
- **WHEN** a list item has no associated target or limit (e.g. a transaction)
- **THEN** the row shows a circular icon badge, title, optional subtitle, and a trailing amount, with no progress bar

#### Scenario: List row with a progress target
- **WHEN** a list item has an associated target or limit (e.g. a savings goal or a budget)
- **THEN** the row additionally shows a progress bar reflecting the current amount against the target/limit

### Requirement: Bar charts on a hero surface use a diagonal hatch-pattern fill
A bar chart rendered on a hero surface (the highlight-colored card described above) SHALL use a diagonal hatch-pattern fill on its bars instead of a solid color fill. Bar charts rendered outside a hero surface, and non-bar chart types (pie, line) regardless of placement, SHALL continue to use solid color fills.

#### Scenario: Bar chart on a hero card
- **WHEN** a bar chart is rendered inside a hero/highlight-colored card
- **THEN** its bars are filled with the diagonal hatch pattern rather than a solid color

#### Scenario: Bar chart outside a hero card
- **WHEN** a bar chart is rendered on a standard (non-highlight) card or page background
- **THEN** its bars use a solid color fill, not the hatch pattern

#### Scenario: Non-bar chart on a hero card
- **WHEN** a pie or line chart is rendered inside a hero/highlight-colored card
- **THEN** it uses a solid color fill; the hatch pattern is not applied to non-bar chart types
