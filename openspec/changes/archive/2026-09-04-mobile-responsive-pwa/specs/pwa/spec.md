## ADDED Requirements

### Requirement: App is installable as a standalone PWA
The system SHALL expose a web app manifest and icon set sufficient for a browser to offer "Add to Home Screen" / "Install app", and the installed app SHALL launch in standalone display mode (no browser address bar or tab chrome).

#### Scenario: User installs the app from a mobile browser
- **WHEN** a user on a supporting mobile browser opens the app and chooses "Add to Home Screen"
- **THEN** an icon is added to their home screen using the app's manifest icon, and launching it opens the app in standalone mode

#### Scenario: Manifest declares required fields
- **WHEN** a browser or Lighthouse audit fetches `/manifest.json`
- **THEN** it contains `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color`, `theme_color`, and icon entries covering at least 192×192 and 512×512 (plus a maskable variant)

### Requirement: Viewport is configured for mobile rendering
The system SHALL declare a viewport configuration (via the Next.js Metadata API) so mobile browsers render the app at device width instead of a desktop-simulated viewport, and SHALL declare a `theme-color` matching the app's UI chrome.

#### Scenario: Page loads on a mobile browser
- **WHEN** any route is loaded on a mobile browser
- **THEN** the page renders at the device's actual width (no pinch-to-zoom-to-read layout) and the browser's UI chrome (status bar / address bar) reflects the declared theme color

### Requirement: Static app shell is cached by a service worker
The system SHALL register a service worker that caches static app-shell assets (JS/CSS bundles, icons, manifest) so that a repeat visit loads the shell without waiting on the network for those assets.

#### Scenario: Repeat visit with the service worker installed
- **WHEN** a user who has previously loaded the app visits again
- **THEN** static shell assets are served from the service worker cache, and the page still renders correctly if the network is slow or briefly unavailable

#### Scenario: Data routes are not served from cache
- **WHEN** the user is offline and the app attempts to fetch account, transaction, or balance data
- **THEN** the request is not answered with cached financial data; the app shows an explicit offline/unavailable state instead of stale numbers

#### Scenario: Deploying a new version invalidates old caches
- **WHEN** a new version of the app is deployed and the service worker activates
- **THEN** previously cached shell assets from the old version are removed so the user does not keep loading stale JS/CSS
