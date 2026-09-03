import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { createTestAccount, createTestCategory, createTestUser } from "./fixtures";

describe("TransactionService", () => {
  it("rejects a transfer to the same account", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "1000.00");

    await expect(
      TransactionService.recordTransfer(user.id, {
        sourceAccountId: account.id,
        destinationAccountId: account.id,
        amount: "100.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toThrow(AppError);
  });

  it("excludes transfers from income and expense totals", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const destination = await createTestAccount(user.id, "0.00");

    await TransactionService.recordTransfer(user.id, {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-15"),
    });

    const summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(summary.income).toBe("0.00");
    expect(summary.expense).toBe("0.00");
    expect(summary.netCashFlow).toBe("0.00");
  });

  it("computes income, expense, and net cash flow for a date range in one aggregate query", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "85000.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: "61500.00",
      transactionDate: new Date("2026-09-05"),
    });
    // Outside the requested range — must not be counted.
    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "1000000.00",
      transactionDate: new Date("2026-08-01"),
    });

    const summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(summary.income).toBe("85000.00");
    expect(summary.expense).toBe("61500.00");
    expect(summary.netCashFlow).toBe("23500.00");
  });

  it("reflects an edit or delete in both balance and summary immediately", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    const transaction = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    await TransactionService.update(user.id, transaction.id, { amount: "4000.00" });
    let summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(summary.expense).toBe("4000.00");
    expect(await AccountService.getBalance(user.id, account.id)).toBe("-4000.00");

    await TransactionService.delete(user.id, transaction.id);
    summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(summary.expense).toBe("0.00");
    expect(await AccountService.getBalance(user.id, account.id)).toBe("0.00");
  });

  it("filters transactions by transactionDate, not createdAt", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "100.00",
      transactionDate: new Date("2026-01-15"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "200.00",
      transactionDate: new Date("2026-09-15"),
    });

    const results = await TransactionService.list(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });

    expect(results).toHaveLength(1);
    expect(results[0].amount.toString()).toBe("200");
  });
});

describe("TransactionService.listPaginated", () => {
  it("searches by description", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "100.00",
      transactionDate: new Date("2026-09-01"),
      description: "September rent",
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "200.00",
      transactionDate: new Date("2026-09-02"),
      description: "Groceries",
    });

    const result = await TransactionService.listPaginated(user.id, { search: "rent" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].description).toBe("September rent");
    expect(result.total).toBe(1);
  });

  it("sorts by amount", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "50.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "500.00",
      transactionDate: new Date("2026-09-02"),
    });

    const result = await TransactionService.listPaginated(user.id, { sortBy: "amount", sortDir: "desc" });
    expect(result.items.map((item) => item.amount)).toEqual(["500", "50"]);
  });

  it("paginates results and reports the total across all pages", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    for (let i = 0; i < 5; i += 1) {
      await TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "10.00",
        transactionDate: new Date(`2026-09-0${i + 1}`),
      });
    }

    const page1 = await TransactionService.listPaginated(user.id, { pageSize: 2, page: 1 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page3 = await TransactionService.listPaginated(user.id, { pageSize: 2, page: 3 });
    expect(page3.items).toHaveLength(1);
  });

  it("includes related account and category names", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "100.00",
      transactionDate: new Date("2026-09-01"),
    });

    const result = await TransactionService.listPaginated(user.id, {});
    expect(result.items[0].accountName).toBe("Test Account");
    expect(result.items[0].categoryName).toBe("Home");
  });
});
