# Product Requirements Document — Personal Finance Tracker

**Working Product Name:** FinTrack  
**Product Type:** Personal Finance Management Web Application  
**Project Type:** Hobby / Portfolio / Resume Project  
**Version:** 1.0  
**Status:** Draft

---

# 1. Product Overview

FinTrack is a personal finance management web application that helps users understand:

- How much money they currently have.
- Which bank account or wallet holds the money.
- What portions of that money are reserved for specific goals.
- Where their money is being spent.
- How expenses change over time.
- Where their money is invested.
- When investments mature.
- How much return they expect from investments.
- Where their income comes from.

The application should provide a clear financial overview without requiring direct integration with banks.

Users will manually record their accounts, transactions, savings allocations, income, expenses, and investments.

---

# 2. Problem Statement

Personal finances are often distributed across multiple bank accounts, cash, investments, and savings goals.

For example:

**BRAC Bank**

Total balance: ৳7,000

- Marriage Fund: ৳5,000
- Travel Fund: ৳2,000

At the same time, a user may have recurring monthly responsibilities such as:

- Home: ৳50,000
- Mother: ৳1,000
- Father: ৳1,000
- Sister: ৳500

Existing banking apps usually show account balances and transaction histories but do not clearly answer questions such as:

- How much money do I actually have?
- Which account contains my money?
- What is that money reserved for?
- How much did I spend this month?
- How much do I usually spend on family?
- How much income came from salary versus business?
- Where is my money invested?
- How much return will I receive?
- Which investment will mature next?
- How is my net worth changing over time?

FinTrack aims to provide one dashboard for answering these questions.

---

# 3. Product Goals

The primary goals are:

1. Provide a complete overview of the user's financial position.
2. Allow users to track balances across multiple accounts.
3. Allow account balances to be divided into savings purposes or goals.
4. Track income and expenses using categories.
5. Allow financial data to be analyzed weekly, monthly, yearly, or using custom date ranges.
6. Track investments and expected returns.
7. Show upcoming investment maturity dates.
8. Display useful financial summaries and trends.
9. Create a polished portfolio project demonstrating real-world application architecture and product thinking.

---

# 4. Non-Goals

The initial version will NOT:

- Connect directly to banks.
- Transfer money.
- Process payments.
- Provide financial advice.
- Execute investments.
- Replace professional accounting software.
- Support business accounting or double-entry bookkeeping.
- Perform tax calculations.
- Support multiple users sharing the same financial account.

These capabilities may be considered in future versions.

---

# 5. Target User

The initial product is designed as a **single-user personal finance application**.

Typical user:

- Receives a monthly salary.
- May have side-business income.
- May earn money from investments.
- Has money across multiple bank accounts.
- Has recurring family or household expenses.
- Saves money for different purposes.
- Makes investments such as DPS, FDR, stocks, savings certificates, business investments, etc.
- Wants better visibility into their financial situation.

---

# 6. Core Product Modules

The application will contain six major modules:

1. Dashboard
2. Accounts
3. Transactions
4. Budgets & Expense Tracking
5. Savings Goals / Money Allocation
6. Investments

---

# 7. Dashboard

## Objective

Provide the user with a high-level overview of their complete financial situation.

## Dashboard Metrics

The dashboard should show:

### Total Available Balance

Total money across all active accounts.

Example:

**৳157,500**

---

### Total Income

Income received during the selected period.

Example:

**Income this month: ৳85,000**

Sources:

- Salary
- Business
- Investment Return
- Freelancing
- Gift
- Other

---

### Total Expenses

Total expenses during the selected period.

Example:

**Expenses this month: ৳61,500**

---

### Net Cash Flow

Formula:

**Net Cash Flow = Income - Expenses**

Example:

Income: ৳85,000  
Expenses: ৳61,500

Net Cash Flow:

**৳23,500**

---

### Total Investments

Current amount invested across all active investments.

Example:

**৳450,000 invested**

---

### Expected Investment Return

Expected return across active investments.

Example:

**Expected Return: ৳42,500**

---

### Savings Rate

Formula:

**Savings Rate = (Income - Expenses) / Income × 100**

Example:

Income: ৳100,000  
Expenses: ৳70,000

Savings Rate:

**30%**

---

# 8. Account Management

Users should be able to create and manage places where they keep money.

## Account Types

Examples:

- Bank Account
- Mobile Banking
- Cash
- Credit Card
- Digital Wallet
- Other

Examples of accounts:

- BRAC Bank
- City Bank
- DBBL
- bKash
- Nagad
- Cash Wallet

---

## Account Fields

Each account should contain:

- Account name
- Account type
- Institution name
- Current balance
- Currency
- Optional account number suffix
- Description
- Status
- Created date

Example:

**Account**

BRAC Bank Savings

**Balance**

৳7,000

---

# 9. Savings Goals / Money Allocation

One of the core differentiators of the application is the ability to assign portions of an account balance to specific purposes.

Example:

BRAC Bank

**Total Balance: ৳7,000**

Allocated:

- Marriage: ৳5,000
- Travel: ৳2,000

Available / Unallocated:

**৳0**

Another example:

City Bank

Balance:

**৳100,000**

Allocated:

- Emergency Fund: ৳40,000
- Laptop: ৳20,000
- Travel: ৳10,000

Unallocated:

**৳30,000**

---

## Goal Fields

A savings goal should contain:

- Goal name
- Target amount
- Current allocated amount
- Target date
- Description
- Status
- Optional icon/color

Example:

**Marriage Fund**

Target: ৳500,000

Saved:

৳180,000

Progress:

36%

Target Date:

December 2028

---

## Goal Features

Users should be able to:

- Create goals.
- Update goals.
- Delete/archive goals.
- Allocate money from an account.
- Move allocations between goals.
- See goal progress.
- See which accounts contain money belonging to the goal.

---

# 10. Transaction Management

Transactions are the foundation of the financial tracking system.

There should be three main transaction types:

### Income

Money entering the user's finances.

Example:

Salary received:

+৳80,000

---

### Expense

Money spent.

Example:

Home expenses:

-৳50,000

---

### Transfer

Money transferred between the user's own accounts.

Example:

BRAC Bank → bKash

৳5,000

Transfers should NOT count as income or expenses.

---

# 11. Income Tracking

Users should be able to record income from multiple sources.

## Default Income Categories

- Salary
- Business
- Freelancing
- Investment Return
- Bonus
- Gift
- Rental Income
- Other

Example transaction:

Date:

1 September 2026

Account:

BRAC Bank

Type:

Income

Category:

Salary

Amount:

৳80,000

Description:

September Salary

---

# 12. Expense Tracking

Users should be able to categorize expenses.

## Example Expense Categories

### Household

- Home
- Rent
- Electricity
- Gas
- Internet
- Groceries

### Family

- Mother
- Father
- Sister
- Parents
- Family Support

### Personal

- Food
- Shopping
- Transportation
- Entertainment
- Health
- Education
- Travel

### Finance

- Loan Payment
- Insurance
- Bank Fees

### Other

- Gifts
- Charity
- Miscellaneous

Users should also be able to create custom categories.

---

# 13. Recurring Expenses

Users often have expenses that occur every month.

Example:

Home: ৳50,000  
Mother: ৳1,000  
Father: ৳1,000  
Sister: ৳500

The system should support recurring transaction templates.

Fields:

- Name
- Amount
- Category
- Account
- Frequency
- Start date
- Optional end date
- Active/inactive

Supported frequencies:

- Weekly
- Monthly
- Quarterly
- Yearly

For the MVP, recurring expenses may generate reminders/templates instead of automatically inserting transactions.

---

# 14. Expense Analytics

Users should be able to analyze expenses by:

- Day
- Week
- Month
- Year
- Custom date range

Filters should include:

- Account
- Category
- Transaction type
- Amount
- Date range

---

## Example Monthly View

### September 2026

Total Expenses:

**৳65,000**

Breakdown:

| Category | Amount |
|---|---:|
| Home | ৳50,000 |
| Mother | ৳1,000 |
| Father | ৳1,000 |
| Sister | ৳500 |
| Food | ৳5,000 |
| Transportation | ৳4,000 |
| Entertainment | ৳3,500 |

---

# 15. Expense Visualization

The analytics section should contain charts.

Recommended charts:

### Expense by Category

Donut / Pie chart showing expense distribution.

Example:

Home: 55%  
Food: 15%  
Family: 10%  
Transport: 8%  
Others: 12%

---

### Income vs Expenses

Bar chart.

Example:

| Month | Income | Expense |
|---|---:|---:|
| July | ৳80K | ৳60K |
| August | ৳85K | ৳62K |
| September | ৳90K | ৳65K |

---

### Expense Trend

Line chart displaying spending over time.

---

### Income Distribution

Show income by source.

Example:

Salary: 80%  
Business: 15%  
Investment: 5%

---

# 16. Investment Tracking

Users should be able to track investments separately from ordinary account balances.

## Supported Investment Types

Examples:

- FDR / Fixed Deposit
- DPS
- Stocks
- Bonds
- Mutual Funds
- Savings Certificates
- Business Investment
- Cryptocurrency
- Real Estate
- Other

---

# 17. Investment Fields

Each investment should contain:

- Investment name
- Investment type
- Institution/platform
- Principal amount
- Investment date
- Start date
- Maturity date
- Expected return
- Expected return percentage
- Current estimated value
- Status
- Notes

Example:

**Investment**

BRAC Bank FDR

Principal:

৳200,000

Interest Rate:

8%

Start Date:

1 January 2026

Maturity Date:

1 January 2027

Expected Return:

৳16,000

Expected Final Value:

৳216,000

Status:

Active

---

# 18. Investment Status

Possible statuses:

- Planned
- Active
- Matured
- Withdrawn
- Cancelled

---

# 19. Investment Dashboard

The investment page should show:

### Total Invested

Example:

৳500,000

### Current Estimated Value

Example:

৳530,000

### Expected Profit

Example:

৳45,000

### Upcoming Maturity

Example:

BRAC Bank FDR

Matures in:

45 days

Expected payout:

৳216,000

---

# 20. Investment Return Handling

When an investment matures, the user should be able to record:

Principal returned:

৳200,000

Profit:

৳16,000

The profit should optionally create an income transaction under:

**Income → Investment Return**

The principal should not be considered new income.

---

# 21. Transfers Between Accounts

Users should be able to move money between accounts.

Example:

Transfer:

BRAC Bank → bKash

Amount:

৳5,000

Result:

BRAC Bank:

-৳5,000

bKash:

+৳5,000

However:

Income remains unchanged.

Expenses remain unchanged.

This avoids artificially increasing income or expense totals.

---

# 22. Search and Filtering

Users should be able to search transactions using:

- Description
- Amount
- Category
- Account

Filters:

- Date
- Week
- Month
- Year
- Custom range
- Account
- Category
- Transaction type

---

# 23. Financial Reports

Users should be able to view reports such as:

### Monthly Financial Summary

- Total Income
- Total Expenses
- Net Savings
- Savings Rate
- Top Expense Category

### Expense Breakdown

Expenses grouped by category.

### Income Breakdown

Income grouped by source.

### Account Balance Report

Balances across accounts.

### Investment Report

- Total Invested
- Active Investments
- Matured Investments
- Expected Returns
- Upcoming Maturities

---

# 24. Net Worth

A future-friendly net-worth calculation should exist in the architecture.

Basic formula:

**Net Worth = Cash + Bank Balances + Investments - Liabilities**

Example:

Bank Accounts:

৳300,000

Investments:

৳500,000

Cash:

৳20,000

Debt:

৳100,000

Net Worth:

**৳720,000**

Liability tracking can be introduced after the MVP.

---

# 25. User Stories

## Accounts

As a user, I want to add multiple bank accounts so that I know where my money is stored.

As a user, I want to see each account balance so that I understand my available funds.

As a user, I want to transfer money between accounts without the transfer being counted as income or expense.

---

## Savings

As a user, I want to allocate money within an account to different goals.

As a user, I want to see how much money is saved for marriage, travel, emergencies, or other goals.

As a user, I want to see how close I am to achieving each savings goal.

---

## Expenses

As a user, I want to record expenses so I can understand where my money goes.

As a user, I want to categorize expenses so I can identify my biggest spending areas.

As a user, I want to see weekly, monthly, and yearly expense summaries.

---

## Income

As a user, I want to record salary income.

As a user, I want to track business income separately.

As a user, I want investment returns to appear separately from salary and business income.

---

## Investments

As a user, I want to record where my money is invested.

As a user, I want to know how much return I expect.

As a user, I want to know when each investment matures.

As a user, I want to see my total active investments.

---

# 26. Main Screens

The application should contain the following pages.

## 1. Dashboard

Contains:

- Total Balance
- Monthly Income
- Monthly Expense
- Net Cash Flow
- Total Investment
- Savings Rate
- Account Balance Summary
- Expense Breakdown
- Income vs Expense Chart
- Upcoming Investment Maturities
- Recent Transactions

---

## 2. Accounts

Displays account cards.

Example:

**BRAC Bank**

Balance: ৳70,000

Allocated:

Marriage — ৳50,000  
Travel — ৳10,000

Available:

৳10,000

Actions:

- Add Transaction
- Transfer Money
- Manage Allocation
- Edit Account

---

## 3. Transactions

Table containing:

| Date | Account | Description | Category | Type | Amount |
|---|---|---|---|---|---:|

Features:

- Search
- Sort
- Filter
- Pagination
- Edit
- Delete

---

## 4. Expenses

Contains:

- Total expenses
- Expense charts
- Category breakdown
- Monthly comparison
- Recurring expenses

---

## 5. Income

Contains:

- Total income
- Income sources
- Salary history
- Business income
- Investment income

---

## 6. Savings Goals

Goal cards displaying:

- Goal name
- Target
- Saved amount
- Remaining amount
- Progress percentage
- Target date

---

## 7. Investments

Investment table/cards displaying:

- Investment
- Institution
- Principal
- Expected Return
- Current Value
- Start Date
- Maturity
- Status

---

## 8. Settings

Contains:

- Profile
- Currency
- Categories
- Account types
- Theme
- Data export
- Data import

---

# 27. Suggested Navigation

Desktop sidebar:

Dashboard

Accounts

Transactions

Income

Expenses

Savings Goals

Investments

Reports

Settings

---

# 28. Data Model

Recommended core database entities:

## User

- id
- name
- email
- passwordHash
- defaultCurrency
- createdAt
- updatedAt

---

## Account

- id
- userId
- name
- institution
- type
- openingBalance
- currency
- status
- createdAt
- updatedAt

---

## Category

- id
- userId
- name
- type
- parentCategoryId
- icon
- createdAt

Category type:

- INCOME
- EXPENSE

---

## Transaction

- id
- userId
- accountId
- categoryId
- type
- amount
- description
- transactionDate
- createdAt
- updatedAt

Transaction type:

- INCOME
- EXPENSE
- TRANSFER

---

## Transfer

- id
- userId
- sourceAccountId
- destinationAccountId
- amount
- transferDate
- note

---

## SavingsGoal

- id
- userId
- name
- targetAmount
- targetDate
- status
- description
- createdAt

---

## GoalAllocation

- id
- savingsGoalId
- accountId
- amount
- createdAt
- updatedAt

This allows one savings goal to contain money from multiple accounts.

---

## Investment

- id
- userId
- accountId
- name
- type
- institution
- principalAmount
- currentValue
- expectedReturnAmount
- expectedReturnRate
- startDate
- maturityDate
- status
- notes
- createdAt
- updatedAt

---

## RecurringTransaction

- id
- userId
- accountId
- categoryId
- type
- amount
- frequency
- startDate
- endDate
- nextOccurrence
- status

---

# 29. Important Financial Rules

The application must follow several accounting rules consistently.

### Rule 1 — Transfers are not income

Moving ৳5,000 from BRAC Bank to bKash does not increase total wealth.

---

### Rule 2 — Transfers are not expenses

Moving money between owned accounts does not represent spending.

---

### Rule 3 — Goal allocation does not change account balance

Example:

BRAC Bank:

৳10,000

Allocate:

Travel: ৳4,000

The bank balance remains:

৳10,000

Only the internal allocation changes.

---

### Rule 4 — Investment principal is not investment income

If:

Principal = ৳100,000

Return = ৳10,000

Only ৳10,000 should count as investment income.

---

### Rule 5 — Financial values should use decimal values

Money should never rely on floating-point arithmetic.

Use:

`DECIMAL / NUMERIC`

instead of:

`FLOAT`

for database financial values.

---

# 30. Functional Requirements

The user must be able to:

- Register.
- Login.
- Logout.
- Create accounts.
- Edit accounts.
- Archive accounts.
- Record income.
- Record expenses.
- Transfer money.
- Create expense categories.
- Create income categories.
- Create savings goals.
- Allocate account money to savings goals.
- Track investment information.
- Filter financial data.
- View financial reports.
- View financial charts.
- Track recurring expenses.
- Export their financial records.

---

# 31. Authentication & Security

Since financial information is sensitive, security should be treated as an important part of the portfolio project.

Requirements:

- Password hashing using Argon2 or bcrypt.
- Authentication through secure sessions or JWT.
- Authorization checks on every user-owned resource.
- HTTPS in production.
- Rate limiting for authentication endpoints.
- Input validation.
- Protection against SQL injection.
- Protection against XSS.
- Secure cookie configuration when cookie authentication is used.
- Environment variables for secrets.
- No bank passwords or banking credentials stored.

---

# 32. Non-Functional Requirements

## Performance

Typical dashboard requests should respond quickly.

Target:

API response under approximately 500 ms for standard requests under normal development-scale usage.

---

## Responsive Design

The application should work on:

- Desktop
- Tablet
- Mobile

Desktop should be the primary experience for the first release.

---

## Accessibility

The application should aim for:

- Keyboard navigation
- Accessible forms
- Proper labels
- Sufficient contrast
- Semantic HTML

---

## Reliability

Financial calculations must remain consistent across pages.

For example:

Dashboard expense total must equal the sum of qualifying expense transactions for the selected date range.

---

# 33. Suggested Technology Stack

A strong resume-friendly stack could be:

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Charts

- Recharts

### Backend

Option A:

Next.js Server Actions / Route Handlers

Option B:

NestJS REST API

Using NestJS makes the backend architecture more visible in a portfolio.

### Database

PostgreSQL

### ORM

Prisma

### Authentication

Auth.js or custom secure session authentication

### Validation

Zod

### Testing

- Vitest
- React Testing Library
- Playwright

### Deployment

Frontend/API:

Vercel, Railway, Fly.io, or Render

Database:

Supabase PostgreSQL, Neon, Railway PostgreSQL, or similar.

---

# 34. Suggested Architecture

For a portfolio project, the application should maintain clear separation between:

UI

↓

API / Application Layer

↓

Business Logic

↓

Data Access Layer

↓

PostgreSQL

Financial calculations should primarily live in services rather than UI components.

Example services:

- AccountService
- TransactionService
- AnalyticsService
- InvestmentService
- SavingsGoalService
- ReportingService

---

# 35. MVP Scope

The first release should focus on the core experience.

## MVP

Include:

- Authentication
- Dashboard
- Account management
- Income transactions
- Expense transactions
- Account transfers
- Categories
- Monthly expense tracking
- Date filtering
- Savings goals
- Account-to-goal allocation
- Investment tracking
- Investment maturity dates
- Basic charts
- Responsive UI

Do NOT build every possible financial feature initially.

---

# 36. Phase 2

After the MVP is working, add:

- Recurring transactions
- Budget limits
- Notifications
- CSV import
- CSV export
- Advanced investment calculations
- Net-worth tracking
- Financial reports
- Goal contribution history
- Dark mode

---

# 37. Phase 3

Potential advanced features:

- Bank API integrations
- Automatic transaction categorization
- AI financial summaries
- Multiple currencies
- Debt tracking
- Credit card tracking
- Portfolio performance charts
- Investment dividend tracking
- PWA/mobile application
- Family financial accounts

---

# 38. Budget Management — Future Feature

Users could assign monthly budgets.

Example:

Food:

Budget: ৳10,000

Spent:

৳7,500

Remaining:

৳2,500

Progress:

75%

Budget statuses:

- Safe
- Approaching limit
- Exceeded

---

# 39. Dashboard Example

Example dashboard:

**Total Balance**

৳247,500

**Income This Month**

৳90,000

**Expenses This Month**

৳62,500

**Net Cash Flow**

+৳27,500

**Savings Rate**

30.5%

**Investments**

৳450,000

---

### Accounts

BRAC Bank — ৳70,000

City Bank — ৳100,000

bKash — ৳12,500

Cash — ৳5,000

---

### Savings Goals

Marriage

৳180,000 / ৳500,000

Travel

৳45,000 / ৳100,000

Emergency Fund

৳120,000 / ৳300,000

---

### Upcoming Investment Maturity

BRAC Bank FDR

Principal:

৳200,000

Expected Return:

৳16,000

Maturity:

January 1, 2027

---

# 40. Example User Flow

A typical monthly workflow could be:

User receives salary.

↓

Creates income transaction:

Salary +৳80,000

↓

Dashboard balance increases.

↓

User allocates:

৳10,000 → Marriage Fund

৳5,000 → Travel Fund

↓

User records monthly household payment:

Home -৳50,000

↓

User records family expenses:

Mother -৳1,000

Father -৳1,000

Sister -৳500

↓

Dashboard recalculates monthly expenses.

↓

User checks monthly report.

↓

User sees:

Income:

৳80,000

Expenses:

৳52,500

Net savings:

৳27,500

---

# 41. Portfolio / Resume Value

This project should demonstrate more than CRUD functionality.

It can showcase:

- Database modelling
- Authentication
- Authorization
- Financial calculations
- Transaction handling
- Data visualization
- Aggregation queries
- Filtering
- Search
- Responsive UI
- API design
- Complex relational data
- Form validation
- Testing
- Deployment
- Product design
- Security considerations

---

# 42. Potential Technical Challenges Worth Showcasing

A strong portfolio project should intentionally solve interesting engineering problems.

Examples:

### Account Balance Calculation

Balances should be derived from transactions rather than manually changed in multiple places.

Conceptually:

Opening Balance  
+ Income  
- Expenses  
+ Incoming Transfers  
- Outgoing Transfers  
= Current Balance

---

### Transaction Integrity

Account transfers should use database transactions so one side cannot succeed while the other fails.

---

### Efficient Analytics

Monthly and yearly reports should use database aggregation rather than downloading every transaction and calculating everything in the browser.

---

### Goal Allocation Validation

The system should prevent allocated money from exceeding available account funds.

Example:

Account:

৳10,000

Already allocated:

৳8,000

Attempted new allocation:

৳5,000

System should reject the request because only ৳2,000 remains unallocated.

---

### Date-Based Analytics

All transaction reports should consistently use transaction dates rather than record creation dates.

---

# 43. Success Metrics

Since this is initially a personal/portfolio project, success can be measured through product completeness rather than commercial KPIs.

The MVP is successful when a user can:

1. Create multiple accounts.
2. Know their total financial balance.
3. Record income and expenses.
4. Understand monthly spending.
5. Compare spending across time periods.
6. See where their money is allocated.
7. Track savings goals.
8. Track investments.
9. Know upcoming investment maturity dates.
10. Understand their monthly net cash flow.

---

# 44. MVP Acceptance Criteria

The MVP will be considered complete when:

- Users can securely register and login.
- Users can create multiple financial accounts.
- Account balances are correctly calculated.
- Users can create income transactions.
- Users can create expense transactions.
- Users can transfer money between accounts.
- Transfers do not affect income/expense totals.
- Users can create categories.
- Users can filter transactions by week, month, year, or custom date range.
- Users can view monthly expense summaries.
- Users can view expense category charts.
- Users can create savings goals.
- Users can allocate account balances to savings goals.
- Allocation totals cannot exceed available account money.
- Users can create investments.
- Users can view investment maturity dates.
- Users can view expected investment returns.
- Users can view dashboard financial summaries.
- The application works on desktop and mobile.
- Core financial business logic has automated tests.

---

# 45. Recommended MVP Build Order

A sensible implementation order is:

**Stage 1 — Foundation**

Authentication  
Database  
User model  
Application layout

↓

**Stage 2 — Accounts**

Account CRUD  
Account balances

↓

**Stage 3 — Transactions**

Income  
Expenses  
Transfers  
Categories

↓

**Stage 4 — Analytics**

Monthly totals  
Filtering  
Expense breakdown  
Income vs expense

↓

**Stage 5 — Savings**

Savings goals  
Account allocation  
Progress tracking

↓

**Stage 6 — Investments**

Investment CRUD  
Return information  
Maturity tracking

↓

**Stage 7 — Dashboard**

Aggregate everything into the main dashboard.

↓

**Stage 8 — Polish**

Responsive design  
Testing  
Error handling  
Empty states  
Loading states  
Deployment

---

# 46. Final Product Vision

FinTrack should eventually answer five questions immediately when the user opens the application:

**1. How much money do I have?**

**2. Where is my money?**

**3. What is my money reserved for?**

**4. Where is my money going?**

**5. How is my money growing?**

If these questions can be answered clearly from the dashboard and related modules, the product is achieving its core purpose.