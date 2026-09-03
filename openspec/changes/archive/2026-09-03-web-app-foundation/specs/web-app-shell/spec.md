## ADDED Requirements

### Requirement: Authenticated routes require a valid session
Every route under the `(app)` route group SHALL require a valid session, checked server-side before the page renders.

#### Scenario: Unauthenticated visitor requests an authenticated route
- **WHEN** a request with no valid session cookie reaches any route inside `(app)`
- **THEN** the system redirects to `/login` without rendering the requested page's content

#### Scenario: Authenticated visitor requests an authenticated route
- **WHEN** a request with a valid, unexpired session cookie reaches a route inside `(app)`
- **THEN** the system renders the requested page inside the shared shell

### Requirement: Sidebar navigation reflects the full product structure
The shell SHALL display sidebar navigation covering every module in PRD §27 (Dashboard, Accounts, Transactions, Income, Expenses, Savings Goals, Investments, Reports, Settings), so the product's intended scope is visible even before every module has a screen.

#### Scenario: Navigating to a module with no screen yet
- **WHEN** the authenticated user views the sidebar for a module not yet implemented (e.g. Dashboard, Transactions)
- **THEN** the link is visibly disabled/marked as not yet available, and does not navigate to a 404 or broken page

#### Scenario: Navigating to a module with a working screen
- **WHEN** the authenticated user selects "Accounts" in the sidebar
- **THEN** they are taken to the Accounts screen, and the sidebar indicates Accounts as the active section

### Requirement: User can log out from the shell
The shell SHALL provide a logout action reachable from every authenticated page.

#### Scenario: User logs out
- **WHEN** an authenticated user triggers logout
- **THEN** their session cookie is cleared and they are redirected to `/login`
