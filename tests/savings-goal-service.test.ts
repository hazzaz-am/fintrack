import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { createTestAccount, createTestCategory, createTestUser } from "./fixtures";

describe("SavingsGoalService", () => {
  it("accepts an allocation within the unallocated balance", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const goal = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "100000.00" });

    await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "8000.00" });

    const progress = await SavingsGoalService.getProgress(user.id, goal.id);
    expect(progress.totalAllocated).toBe("8000.00");
  });

  it("rejects an allocation that exceeds the unallocated balance", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const goalA = await SavingsGoalService.create(user.id, { name: "Marriage", targetAmount: "500000.00" });
    const goalB = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "100000.00" });

    await SavingsGoalService.allocate(user.id, { goalId: goalA.id, accountId: account.id, amount: "8000.00" });

    await expect(
      SavingsGoalService.allocate(user.id, { goalId: goalB.id, accountId: account.id, amount: "5000.00" })
    ).rejects.toThrow(AppError);

    // Only ৳2,000 should have been left unallocated, and the rejected
    // attempt must not have partially applied.
    const status = await SavingsGoalService.getAccountAllocationStatus(user.id, account.id);
    expect(status.unallocated).toBe("2000.00");
  });

  it("does not change the account balance when allocating", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const goal = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "100000.00" });

    const balanceBefore = await AccountService.getBalance(user.id, account.id);
    await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "4000.00" });
    const balanceAfter = await AccountService.getBalance(user.id, account.id);

    expect(balanceAfter).toBe(balanceBefore);
  });

  it("moving an allocation between goals produces two ledger events and preserves history", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const marriage = await SavingsGoalService.create(user.id, { name: "Marriage", targetAmount: "500000.00" });
    const travel = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "100000.00" });

    await SavingsGoalService.allocate(user.id, { goalId: marriage.id, accountId: account.id, amount: "5000.00" });
    await SavingsGoalService.moveAllocation(user.id, {
      fromGoalId: marriage.id,
      toGoalId: travel.id,
      accountId: account.id,
      amount: "1000.00",
    });

    const marriageProgress = await SavingsGoalService.getProgress(user.id, marriage.id);
    const travelProgress = await SavingsGoalService.getProgress(user.id, travel.id);
    expect(marriageProgress.totalAllocated).toBe("4000.00");
    expect(travelProgress.totalAllocated).toBe("1000.00");

    const events = await prisma.goalAllocationEvent.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events).toHaveLength(3); // original allocate + the two move events
    expect(events.map((e) => e.amount.toString())).toEqual(["5000", "-1000", "1000"]);
  });

  it("surfaces an over-allocated warning without blocking the transaction edit that caused it", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const expenseCategory = await createTestCategory(user.id, "EXPENSE", "Home");
    const goal = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "100000.00" });

    await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "8000.00" });

    const expense = await TransactionService.recordExpense(user.id, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: "1000.00",
      transactionDate: new Date("2026-09-01"),
    });

    // Balance is now 9000, still >= the 8000 allocated — not yet over-allocated.
    let status = await SavingsGoalService.getAccountAllocationStatus(user.id, account.id);
    expect(status.isOverAllocated).toBe(false);

    // Retroactively increase the expense so balance (5000) drops below allocated (8000).
    await expect(
      TransactionService.update(user.id, expense.id, { amount: "5000.00" })
    ).resolves.not.toThrow();

    status = await SavingsGoalService.getAccountAllocationStatus(user.id, account.id);
    expect(status.isOverAllocated).toBe(true);
    expect(status.unallocated).toBe("-3000.00");
  });
});
