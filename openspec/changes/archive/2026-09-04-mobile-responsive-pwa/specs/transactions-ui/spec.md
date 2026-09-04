## ADDED Requirements

### Requirement: Transaction filters remain usable at phone widths
The transaction filter form SHALL default to a single-column layout below the `sm` breakpoint instead of a cramped two-up grid, widening to multi-column only at larger breakpoints.

#### Scenario: Filter form viewed at 375px width
- **WHEN** the transaction filters form is loaded at a 375px viewport width
- **THEN** each field (search, type, date range, account, category, custom from/to, sort) occupies its own full-width row, and the Apply/Clear actions remain reachable without horizontal scrolling

### Requirement: Transaction list remains usable at phone widths
The transaction list rows SHALL remain fully readable at phone widths, with description, account/category context, and amount all visible without horizontal overflow.

#### Scenario: Transaction list viewed at 375px width
- **WHEN** the transaction list is loaded at a 375px viewport width
- **THEN** each row's title, subtitle, and trailing amount/actions remain visible without clipping or requiring horizontal scroll
