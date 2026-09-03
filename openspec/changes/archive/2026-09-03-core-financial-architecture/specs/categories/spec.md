## ADDED Requirements

### Requirement: Default Categories
The system SHALL provide a default set of income and expense categories (per PRD §11-12: Salary, Business, Freelancing, Investment Return, Bonus, Gift, Rental Income, Other for income; Home, Rent, Electricity, Gas, Internet, Groceries, Mother, Father, Sister, Family Support, Food, Shopping, Transportation, Entertainment, Health, Education, Travel, Loan Payment, Insurance, Bank Fees, Gifts, Charity, Miscellaneous for expense) available to every user without manual setup.

#### Scenario: New user has default categories
- **WHEN** a user registers and requests their category list before creating any custom category
- **THEN** the system returns the full default set, correctly split into INCOME and EXPENSE types

### Requirement: Custom Category Creation
The system SHALL allow a user to create a custom category with a name, type (INCOME or EXPENSE), and optional parent category and icon.

#### Scenario: Create custom category
- **WHEN** a user creates a category named "Side Hustle" with type INCOME
- **THEN** the system adds it to that user's category list, available for use on transactions

### Requirement: Category Type Enforcement
The system SHALL enforce that a category's type (INCOME or EXPENSE) is consistent with the transaction types it can be attached to, and a transfer transaction SHALL NOT have a category.

#### Scenario: Income category on expense transaction rejected
- **WHEN** a user attempts to create an expense transaction using a category whose type is INCOME
- **THEN** the system rejects the transaction with a validation error

#### Scenario: Category on transfer rejected
- **WHEN** a user attempts to create a transfer transaction with a category attached
- **THEN** the system rejects the request, since transfers are not categorized income or expense
