import { describe, expect, it } from "vitest";
import { CategoryService } from "@/lib/services/category-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { createTestAccount, createTestCategory, createTestUser } from "./fixtures";

describe("CategoryService — update", () => {
  it("renames a category", async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id, "EXPENSE", "Groceries");

    const updated = await CategoryService.update(user.id, category.id, { name: "Food & Groceries" });
    expect(updated.name).toBe("Food & Groceries");
  });

  it("re-parents a category to another owned category", async () => {
    const user = await createTestUser();
    const parent = await createTestCategory(user.id, "EXPENSE", "Family");
    const child = await createTestCategory(user.id, "EXPENSE", "Mother");

    const updated = await CategoryService.update(user.id, child.id, { parentCategoryId: parent.id });
    expect(updated.parentCategoryId).toBe(parent.id);
  });

  it("rejects a category being set as its own parent", async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id, "EXPENSE", "Food");

    await expect(
      CategoryService.update(user.id, category.id, { parentCategoryId: category.id })
    ).rejects.toThrow(AppError);
  });

  it("rejects updating another user's category", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const category = await createTestCategory(owner.id, "EXPENSE", "Food");

    await expect(
      CategoryService.update(intruder.id, category.id, { name: "Hijacked" })
    ).rejects.toThrow(AppError);
  });
});

describe("CategoryService — delete", () => {
  it("deletes a category with no references", async () => {
    const user = await createTestUser();
    const category = await createTestCategory(user.id, "EXPENSE", "Unused");

    await CategoryService.delete(user.id, category.id);

    const remaining = await CategoryService.list(user.id);
    expect(remaining.find((c) => c.id === category.id)).toBeUndefined();
  });

  it("rejects deleting a category referenced by transactions, and leaves it and the transaction untouched", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "1000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Food");

    const transaction = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "500.00",
      transactionDate: new Date("2026-09-01"),
    });

    await expect(CategoryService.delete(user.id, category.id)).rejects.toThrow(AppError);

    const stillThere = await prisma.category.findUnique({ where: { id: category.id } });
    expect(stillThere).not.toBeNull();
    const unchangedTransaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(unchangedTransaction.categoryId).toBe(category.id);
  });

  it("allows deleting a category once its transactions are reassigned elsewhere", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "1000.00");
    const category = await createTestCategory(user.id, "EXPENSE", "Food");
    const otherCategory = await createTestCategory(user.id, "EXPENSE", "Shopping");

    const transaction = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: category.id,
      amount: "500.00",
      transactionDate: new Date("2026-09-01"),
    });

    await TransactionService.update(user.id, transaction.id, { categoryId: otherCategory.id });

    await CategoryService.delete(user.id, category.id);

    const remaining = await CategoryService.list(user.id);
    expect(remaining.find((c) => c.id === category.id)).toBeUndefined();
  });

  it("deleting a category with children unsets their parent instead of deleting them", async () => {
    const user = await createTestUser();
    const parent = await createTestCategory(user.id, "EXPENSE", "Family");
    const child = await createTestCategory(user.id, "EXPENSE", "Mother");
    await CategoryService.update(user.id, child.id, { parentCategoryId: parent.id });

    await CategoryService.delete(user.id, parent.id);

    const updatedChild = await prisma.category.findUniqueOrThrow({ where: { id: child.id } });
    expect(updatedChild.parentCategoryId).toBeNull();
  });

  it("rejects deleting another user's category", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const category = await createTestCategory(owner.id, "EXPENSE", "Food");

    await expect(CategoryService.delete(intruder.id, category.id)).rejects.toThrow(AppError);
  });
});
