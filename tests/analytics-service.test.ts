import { describe, expect, it } from "vitest";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { createTestAccount, createTestCategory, createTestUser } from "./fixtures";

describe("AnalyticsService.getCategoryBreakdown", () => {
  it("groups expenses by category for a date range", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "100000.00");
    const home = await createTestCategory(user.id, "EXPENSE", "Home");
    const food = await createTestCategory(user.id, "EXPENSE", "Food");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: home.id,
      amount: "50000.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: home.id,
      amount: "10000.00",
      transactionDate: new Date("2026-09-10"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: food.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const breakdown = await AnalyticsService.getCategoryBreakdown(user.id, "EXPENSE", {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(breakdown).toEqual([
      { categoryId: home.id, categoryName: "Home", amount: "60000.00" },
      { categoryId: food.id, categoryName: "Food", amount: "5000.00" },
    ]);
  });

  it("includes VAT in a category's total", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const electronics = await createTestCategory(user.id, "EXPENSE", "Electronics");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: electronics.id,
      amount: "3000.00",
      vatAmount: "450.00",
      transactionDate: new Date("2026-09-01"),
    });

    const breakdown = await AnalyticsService.getCategoryBreakdown(user.id, "EXPENSE", {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(breakdown).toEqual([{ categoryId: electronics.id, categoryName: "Electronics", amount: "3450.00" }]);
  });

  it("returns an empty array, not an error, for a range with no matching transactions", async () => {
    const user = await createTestUser();
    const breakdown = await AnalyticsService.getCategoryBreakdown(user.id, "EXPENSE", {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(breakdown).toEqual([]);
  });

  it("excludes transfers from a breakdown", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const destination = await createTestAccount(user.id, "0.00");

    await TransactionService.recordTransfer(user.id, {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    const breakdown = await AnalyticsService.getCategoryBreakdown(user.id, "EXPENSE", {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(breakdown).toEqual([]);
  });

  it("scopes to the requesting user only", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const accountA = await createTestAccount(userA.id, "1000.00");
    const categoryA = await createTestCategory(userA.id, "EXPENSE", "Home");
    const accountB = await createTestAccount(userB.id, "1000000.00");
    const categoryB = await createTestCategory(userB.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(userA.id, {
      accountId: accountA.id,
      categoryId: categoryA.id,
      amount: "100.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(userB.id, {
      accountId: accountB.id,
      categoryId: categoryB.id,
      amount: "999999.00",
      transactionDate: new Date("2026-09-01"),
    });

    const breakdown = await AnalyticsService.getCategoryBreakdown(userA.id, "EXPENSE", {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(breakdown).toEqual([{ categoryId: categoryA.id, categoryName: "Home", amount: "100.00" }]);
  });
});

describe("AnalyticsService.getMonthlyTrend", () => {
  it("returns one income/expense total per month in range, including a zero-activity month", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "80000.00",
      transactionDate: new Date("2026-07-05"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: "50000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const trend = await AnalyticsService.getMonthlyTrend(user.id, {
      from: new Date("2026-07-01"),
      to: new Date("2026-09-30"),
    });

    expect(trend).toEqual([
      { month: "2026-07", income: "80000.00", expense: "0.00" },
      { month: "2026-08", income: "0.00", expense: "0.00" },
      { month: "2026-09", income: "0.00", expense: "50000.00" },
    ]);
  });

  it("includes VAT in a month's expense total", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "100.00",
      vatAmount: "15.00",
      transactionDate: new Date("2026-09-05"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "300.00",
      vatAmount: "0.00",
      transactionDate: new Date("2026-09-06"),
    });

    const trend = await AnalyticsService.getMonthlyTrend(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(trend).toEqual([{ month: "2026-09", income: "0.00", expense: "415.00" }]);
  });

  it("scopes to the requesting user only", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const accountA = await createTestAccount(userA.id, "0.00");
    const categoryA = await createTestCategory(userA.id, "INCOME", "Salary");
    const accountB = await createTestAccount(userB.id, "0.00");
    const categoryB = await createTestCategory(userB.id, "INCOME", "Salary");

    await TransactionService.recordIncome(userA.id, {
      accountId: accountA.id,
      categoryId: categoryA.id,
      amount: "100.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordIncome(userB.id, {
      accountId: accountB.id,
      categoryId: categoryB.id,
      amount: "999999.00",
      transactionDate: new Date("2026-09-01"),
    });

    const trend = await AnalyticsService.getMonthlyTrend(userA.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(trend).toEqual([{ month: "2026-09", income: "100.00", expense: "0.00" }]);
  });
});
