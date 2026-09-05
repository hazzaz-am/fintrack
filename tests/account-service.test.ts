import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { createTestAccount, createTestCategory, createTestInvestment, createTestUser } from "./fixtures";

describe("AccountService — derived balance", () => {
  it("reflects only the opening balance when no transactions exist", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "1000.00");

    const balance = await AccountService.getBalance(user.id, account.id);
    expect(balance).toBe("1000.00");
  });

  it("reflects income and expense transactions", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "80000.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: "50000.00",
      transactionDate: new Date("2026-09-02"),
    });

    const balance = await AccountService.getBalance(user.id, account.id);
    expect(balance).toBe("30000.00");
  });

  it("reflects a transfer on both the source and destination accounts, without double counting", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const destination = await createTestAccount(user.id, "0.00");

    await TransactionService.recordTransfer(user.id, {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, source.id)).toBe("5000.00");
    expect(await AccountService.getBalance(user.id, destination.id)).toBe("5000.00");
  });

  it("reflects an edited transaction amount immediately, with no separate reconciliation step", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    const transaction = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("5000.00");

    await TransactionService.update(user.id, transaction.id, { amount: "4000.00" });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("6000.00");
  });

  it("deducts VAT from the account paying an expense, matching the VAT-inclusive expense total", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "1000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "100.00",
      vatAmount: "15.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("885.00");

    const summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    expect(summary.expense).toBe("115.00");
  });

  it("deducts VAT from only the source account of a transfer, leaving the destination unaffected", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "1000.00");
    const destination = await createTestAccount(user.id, "0.00");

    await TransactionService.recordTransfer(user.id, {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: "200.00",
      vatAmount: "10.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, source.id)).toBe("790.00");
    expect(await AccountService.getBalance(user.id, destination.id)).toBe("200.00");
  });

  it("ignores a VAT amount sent on an income transaction", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "INCOME", "Salary");

    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "500.00",
      vatAmount: "50.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("500.00");
  });

  it("computes balances for every account in one pass via listWithBalances", async () => {
    const user = await createTestUser();
    const a = await createTestAccount(user.id, "100.00");
    const b = await createTestAccount(user.id, "200.00");

    const accounts = await AccountService.listWithBalances(user.id);
    const byId = new Map(accounts.map((acc) => [acc.id, acc.balance]));

    expect(byId.get(a.id)).toBe("100.00");
    expect(byId.get(b.id)).toBe("200.00");
  });

  it("reflects an investment contribution and return without affecting income/expense (regression for design.md D6)", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const investment = await createTestInvestment(user.id, "0.00");

    await InvestmentService.contribute(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      amount: "4000.00",
      transactionDate: new Date("2026-09-01"),
    });
    expect(await AccountService.getBalance(user.id, account.id)).toBe("6000.00");

    await InvestmentService.recordMaturityOrWithdrawal(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      principalAmount: "4000.00",
      profitAmount: "300.00",
      transactionDate: new Date("2026-09-10"),
      newStatus: "MATURED",
    });
    expect(await AccountService.getBalance(user.id, account.id)).toBe("10300.00");

    const summary = await TransactionService.getSummary(user.id, {
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    });
    // Only the profit counts as income; the returned principal does not (PRD Rule 4).
    expect(summary.income).toBe("300.00");
    expect(summary.expense).toBe("0.00");
  });

  it("existing INCOME/EXPENSE/TRANSFER balance behavior is unchanged by the investment terms", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");

    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "80000.00",
      transactionDate: new Date("2026-09-01"),
    });
    await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: "50000.00",
      transactionDate: new Date("2026-09-02"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("30000.00");
  });
});

describe("AccountService — chronological balance guard", () => {
  it("allows an expense that stays within the account's balance", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "5000.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).resolves.not.toThrow();
    expect(await AccountService.getBalance(user.id, account.id)).toBe("5000.00");
  });

  it("rejects an expense that would exceed the account's current balance", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "5000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "50000.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toThrow(AppError);
    expect(await AccountService.getBalance(user.id, account.id)).toBe("5000.00");
  });

  it("rejects a backdated expense that dips the balance negative at that point in time, even though the final total stays positive", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");

    // Funds the account, dated AFTER the backdated expense attempted below.
    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "10000.00",
      transactionDate: new Date("2026-09-05"),
    });

    // 10000 (income) - 8000 (expense) = 2000 is positive overall, but the
    // expense is dated BEFORE the income, so chronologically the account
    // would sit at -8000 on 2026-09-01.
    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: expenseCategory.id,
        amount: "8000.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toThrow(AppError);
  });

  it("orders same-day transactions by creation order for the chronological walk", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");
    const incomeCategory = await createTestCategory(user.id, "INCOME", "Salary");

    // Recorded first, same day — its createdAt puts it earlier in the walk,
    // funding the account before the expense below is evaluated.
    await TransactionService.recordIncome(user.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: expenseCategory.id,
        amount: "5000.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).resolves.not.toThrow();
  });

  it("counts VAT as part of the outflow when checking balance sufficiency", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "4800.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "4500.00",
        vatAmount: "500.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toThrow(AppError);
  });
});
