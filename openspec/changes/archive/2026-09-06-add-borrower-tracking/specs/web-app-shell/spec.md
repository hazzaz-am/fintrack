## MODIFIED Requirements

### Requirement: Sidebar navigation reflects the full product structure
The shell SHALL display sidebar navigation covering every module in PRD §27 (Dashboard, Accounts, Transactions, Income, Expenses, Savings Goals, Investments, Reports, Settings) plus Borrowers, so the product's intended scope is visible even before every module has a screen.

#### Scenario: Navigating to a module with no screen yet
- **WHEN** the authenticated user views the sidebar for a module not yet implemented (e.g. Dashboard, Transactions)
- **THEN** the link is visibly disabled/marked as not yet available, and does not navigate to a 404 or broken page

#### Scenario: Navigating to a module with a working screen
- **WHEN** the authenticated user selects "Accounts" in the sidebar
- **THEN** they are taken to the Accounts screen, and the sidebar indicates Accounts as the active section

#### Scenario: Navigating to Borrowers
- **WHEN** the authenticated user selects "Borrowers" in the sidebar
- **THEN** they are taken to the Borrowers screen, and the sidebar indicates Borrowers as the active section
