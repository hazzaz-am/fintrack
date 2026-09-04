## ADDED Requirements

### Requirement: Shell remains usable at phone widths
The shared shell (sidebar navigation and header) SHALL remain fully usable at widths from 375px up, with the sidebar collapsing to an overlay/drawer pattern rather than compressing into an unusable rail.

#### Scenario: Authenticated user opens the shell on a phone
- **WHEN** an authenticated user loads any `(app)` route at a 375–430px viewport width
- **THEN** the sidebar is collapsed behind a trigger (not permanently visible taking up horizontal space), the header fits without overflow, and opening the sidebar presents it as an overlay that doesn't reflow or squeeze the page content underneath
