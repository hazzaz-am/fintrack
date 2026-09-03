import { describe, expect, it } from "vitest";
import { AccountService } from "@/lib/services/account-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { createTestAccount, createTestCategory, createTestUser } from "./fixtures";

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
    const account = await createTestAccount(user.id, "0.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Home");

    const transaction = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "5000.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("-5000.00");

    await TransactionService.update(user.id, transaction.id, { amount: "4000.00" });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("-4000.00");
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
});
