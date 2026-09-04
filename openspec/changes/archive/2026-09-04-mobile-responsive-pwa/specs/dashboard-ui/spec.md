## ADDED Requirements

### Requirement: Dashboard remains usable at phone widths
The Dashboard's metric card grids and chart cards SHALL reflow to fit narrow screens without horizontal scrolling, truncated values, or overlapping text.

#### Scenario: Dashboard viewed at 375px width
- **WHEN** the Dashboard is loaded at a 375px viewport width
- **THEN** metric cards (income, expenses, net cash flow, savings rate, investment totals) stack into a legible grid with no clipped currency values, and the balance trend chart and category breakdown chart resize to fit within the viewport without horizontal overflow
