## 1. Foundation

- [x] 1.1 Add PostgreSQL + Prisma to the project (`prisma`, `@prisma/client`), configure `DATABASE_URL` via env var
- [x] 1.2 Write `prisma/schema.prisma` for `User`, `Account`, `Category`, `Transaction`, `SavingsGoal`, `GoalAllocationEvent` per design.md's Data Model (Decimal money fields, no `Account.balance` column, `Transaction.amount` always positive)
- [x] 1.3 Run initial migration and verify schema against a local Postgres instance
- [x] 1.4 Add Zod schemas for input validation shared across route handlers/Server Actions
- [x] 1.5 Add password hashing (Argon2id) and session handling (signed httpOnly secure cookie); add `src/lib/auth/session.ts`
- [x] 1.6 Implement `AuthService`: register, login, logout, `getCurrentUser(request)`
- [x] 1.7 Add auth Route Handlers / Server Actions (register, login, logout) and a reusable `requireAuth()` guard for downstream capabilities
- [x] 1.8 Add rate limiting to auth endpoints (register/login)

## 2. Accounts

- [x] 2.1 Implement `AccountService.create/update/archive(userId, ...)` — no direct balance field ever accepted or stored
- [x] 2.2 Implement `AccountService.getBalance(accountId)` as a single aggregation query per design.md D1's formula
- [x] 2.3 Implement `AccountService.listWithBalances(userId)` as one grouped query (no N+1 across accounts)
- [x] 2.4 Add Route Handlers/Server Actions for account CRUD, each scoped to the authenticated user via `requireAuth()`
- [x] 2.5 Add automated tests: opening balance only, income/expense affecting balance, transfer affecting both sides, balance updates immediately after a transaction edit

## 3. Categories

- [x] 3.1 Seed default income/expense categories (decide seed-on-registration vs. shared-default-set per design.md's Open Questions, document the choice)
- [x] 3.2 Implement `CategoryService.create/list(userId)` supporting custom categories with optional parent category
- [x] 3.3 Enforce category type (INCOME/EXPENSE) matches transaction type at the service layer; reject category on TRANSFER transactions
- [x] 3.4 Add Route Handlers/Server Actions for category CRUD

## 4. Transactions

- [x] 4.1 Implement `TransactionService.recordIncome/recordExpense(userId, accountId, categoryId, amount, date, description)`
- [x] 4.2 Implement `TransactionService.recordTransfer(userId, sourceAccountId, destinationAccountId, amount, date, note)` as a single atomic operation, rejecting same-account transfers
- [x] 4.3 Implement `TransactionService.update/delete(userId, transactionId, ...)`, ensuring downstream balance/aggregate reads reflect changes immediately
- [x] 4.4 Implement date-range filtering (day/week/month/year/custom) keyed on `transactionDate`, not `createdAt`
- [x] 4.5 Implement monthly aggregation (`getSummary(userId, dateRange)` → total income, total expenses, net cash flow) via a single DB aggregate query
- [x] 4.6 Add Route Handlers/Server Actions for transaction CRUD, filtering, and summary
- [x] 4.7 Add automated tests: transfer atomicity, transfer excluded from income/expense totals, edit/delete reflected in balance and summary, date-range filtering correctness

## 5. Savings Goals

- [x] 5.1 Implement `SavingsGoalService.create(userId, name, targetAmount, targetDate?, description?)`
- [x] 5.2 Implement `SavingsGoalService.allocate(userId, goalId, accountId, amount)` — computes unallocated balance inside a DB transaction, hard-rejects if amount exceeds it, else inserts a `GoalAllocationEvent`
- [x] 5.3 Implement `SavingsGoalService.moveAllocation(userId, fromGoalId, toGoalId, accountId, amount)` as two `GoalAllocationEvent` rows written in one DB transaction
- [x] 5.4 Implement `SavingsGoalService.getProgress(goalId)` — derived allocated total, progress %, per-account contribution breakdown
- [x] 5.5 Implement `isOverAllocated` computation on accounts/goals (unallocated balance < 0), exposed on the relevant read methods
- [x] 5.6 Add Route Handlers/Server Actions for goal CRUD and allocation actions
- [x] 5.7 Add automated tests: allocation within/exceeding limit, allocation doesn't change account balance, move-between-goals produces two ledger events, retroactive transaction edit surfaces over-allocation without blocking the edit

## 6. Cross-Cutting Polish

- [x] 6.1 Verify every service method for these five capabilities scopes its Prisma queries by `userId` (authorization convention from design.md D5)
- [x] 6.2 Add input validation error handling and consistent API error shapes across all new endpoints
- [x] 6.3 Confirm all monetary columns use `DECIMAL`/`NUMERIC`, never floating point, end-to-end (schema, Zod schemas, service arithmetic)
- [x] 6.4 Run full test suite for accounts/transactions/savings-goals services and fix any gaps before moving to the next change
