import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { TransactionService } from "@/lib/services/transaction-service";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { createRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { createTestAccount, createTestCategory, createTestRecurringTransaction, createTestUser } from "./fixtures";

describe("RecurringTransactionService", () => {
  it("a template with startDate today and no prior transactions is due", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
    });

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    expect(due.map((t) => t.id)).toContain(template.id);
  });

  it("a template with a linked transaction inside the current slot is not due", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
    });

    await RecurringTransactionService.confirm(user.id, template.id, {});

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    expect(due.map((t) => t.id)).not.toContain(template.id);
  });

  it("a template unconfirmed for three elapsed monthly slots is due exactly once, not three times", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: threeMonthsAgo,
      frequency: "MONTHLY",
    });

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    const matches = due.filter((t) => t.id === template.id);
    expect(matches).toHaveLength(1);
  });

  it("an inactive template never appears in getDueTemplates", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
    });
    await RecurringTransactionService.archive(user.id, template.id);

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    expect(due.map((t) => t.id)).not.toContain(template.id);
  });

  it("a template past its endDate never appears as due", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: lastYear,
      endDate: lastYear,
    });

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    expect(due.map((t) => t.id)).not.toContain(template.id);
  });

  it("confirming a due template creates a transaction that participates in TransactionService.getSummary like a manually entered one", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
      amount: "500.00",
    });

    await RecurringTransactionService.confirm(user.id, template.id, {});

    const now = new Date();
    const summary = await TransactionService.getSummary(user.id, {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    });
    expect(summary.expense).toBe("500.00");
  });

  it("confirming rejects if the template is not currently due", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: nextYear,
    });

    await expect(RecurringTransactionService.confirm(user.id, template.id, {})).rejects.toThrow(AppError);
  });

  it("confirming twice for the same slot rejects the second attempt", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
    });

    await RecurringTransactionService.confirm(user.id, template.id, {});
    await expect(RecurringTransactionService.confirm(user.id, template.id, {})).rejects.toThrow(AppError);
  });

  it("editing a template's amount does not change previously generated transactions' recorded amounts", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: new Date(),
      amount: "1000.00",
    });

    const transaction = await RecurringTransactionService.confirm(user.id, template.id, {});
    await RecurringTransactionService.update(user.id, template.id, { amount: "2000.00" });

    const now = new Date();
    const summary = await TransactionService.getSummary(user.id, {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    });
    expect(transaction.amount.toString()).toBe("1000");
    expect(summary.expense).toBe("1000.00");
  });

  it("rejects creating a template with a category whose type doesn't match", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const incomeCategory = await createTestCategory(user.id, "INCOME");

    await expect(
      RecurringTransactionService.create(user.id, {
        name: "Mismatched",
        accountId: account.id,
        categoryId: incomeCategory.id,
        type: "EXPENSE",
        amount: "100.00",
        frequency: "MONTHLY",
        startDate: new Date("2026-01-01"),
      })
    ).rejects.toThrow(AppError);
  });

  it("deactivating a template stops it from appearing as due but leaves prior transactions untouched", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const category = await createTestCategory(user.id, "EXPENSE");
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const template = await createTestRecurringTransaction(user.id, account.id, category.id, {
      startDate: twoMonthsAgo,
    });
    const transaction = await RecurringTransactionService.confirm(user.id, template.id, {
      transactionDate: twoMonthsAgo,
    });

    await RecurringTransactionService.archive(user.id, template.id);

    const due = await RecurringTransactionService.getDueTemplates(user.id);
    expect(due.map((t) => t.id)).not.toContain(template.id);

    const stillLinked = await TransactionService.list(user.id, {});
    expect(stillLinked.find((t) => t.id === transaction.id)).toBeDefined();
  });
});

describe("createRecurringTransactionSchema", () => {
  it("rejects a Transfer type — recurring templates are Income/Expense only", () => {
    const parsed = createRecurringTransactionSchema.safeParse({
      name: "Bad",
      accountId: "clx0000000000000000000000",
      categoryId: "clx0000000000000000000000",
      type: "TRANSFER",
      amount: "100.00",
      frequency: "MONTHLY",
      startDate: "2026-01-01",
    });
    expect(parsed.success).toBe(false);
  });
});
