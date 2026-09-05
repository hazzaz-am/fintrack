import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { GoalReservationService, computeShortfall } from "@/lib/services/goal-reservation-service";
import type { ReservationConsentInput } from "@/lib/validation/goal-reservation";
import { createTestAccount, createTestCategory, createTestInvestment, createTestUser } from "./fixtures";

async function setupMarriageScenario() {
  const user = await createTestUser();
  const account = await createTestAccount(user.id, "10500.00");
  const category = await createTestCategory(user.id, "EXPENSE", "Home");
  const goal = await SavingsGoalService.create(user.id, { name: "Marriage", targetAmount: "500000.00" });
  await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "10000.00" });
  return { user, account, category, goal };
}

const permanentConsent = (goalId: string, amount: string): ReservationConsentInput => ({
  concent: true,
  allocations: [{ goalId, amount }],
});

const returningConsent = (goalId: string, amount: string, returnBy: Date): ReservationConsentInput => ({
  concent: true,
  allocations: [{ goalId, amount, returnBy }],
});

describe("GoalReservationService — shortfall computation", () => {
  it("reports zero shortfall when the outflow fits within the unallocated buffer", async () => {
    const { user, account } = await setupMarriageScenario();
    const result = await computeShortfall(user.id, account.id, "400.00");
    expect(result.shortfall).toBe("0.00");
  });

  it("reports zero shortfall exactly at the boundary", async () => {
    const { user, account } = await setupMarriageScenario();
    const result = await computeShortfall(user.id, account.id, "500.00");
    expect(result.shortfall).toBe("0.00");
  });

  it("computes the shortfall and lists the reserving goal when the outflow dips into the reserve", async () => {
    const { user, account, goal } = await setupMarriageScenario();
    const result = await computeShortfall(user.id, account.id, "700.00");
    expect(result.shortfall).toBe("200.00");
    expect(result.unallocated).toBe("500.00");
    expect(result.goals).toEqual([{ goalId: goal.id, goalName: "Marriage", reserved: "10000.00" }]);
  });

  it("counts VAT toward the shortfall", async () => {
    const { user, account } = await setupMarriageScenario();
    const result = await computeShortfall(user.id, account.id, "450.00", "100.00");
    expect(result.shortfall).toBe("50.00");
  });
});

describe("GoalReservationService — consent enforcement on new transactions", () => {
  it("rejects an expense that dips into the reserve when no consent is given", async () => {
    const { user, account, category } = await setupMarriageScenario();
    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "700.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toMatchObject({ code: "RESERVATION_CONSENT_REQUIRED" });
  });

  it("insufficient balance is rejected before the reservation guard ever runs", async () => {
    const { user, account, category } = await setupMarriageScenario();
    await expect(
      TransactionService.recordExpense(user.id, {
        accountId: account.id,
        categoryId: category.id,
        amount: "50000.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
  });

  it("accepts a permanent-reduction consent, creating exactly the shortfall as a negative ledger entry and no promise", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();

    const expense = await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      permanentConsent(goal.id, "200.00")
    );

    const events = await prisma.goalAllocationEvent.findMany({ where: { sourceTransactionId: expense.id } });
    expect(events).toHaveLength(1);
    expect(events[0].amount.toString()).toBe("-200");
    expect(events[0].promiseId).toBeNull();

    const progress = await SavingsGoalService.getProgress(user.id, goal.id);
    expect(progress.totalAllocated).toBe("9800.00");

    const promises = await GoalReservationService.listOpenPromises(user.id);
    expect(promises).toHaveLength(0);
  });

  it("accepts a returning consent, creating an open promise for exactly the shortfall", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();
    const returnBy = new Date("2026-10-15");

    await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      returningConsent(goal.id, "200.00", returnBy)
    );

    const promises = await GoalReservationService.listOpenPromises(user.id);
    expect(promises).toHaveLength(1);
    expect(promises[0]).toMatchObject({
      goalName: "Marriage",
      amount: "200.00",
      remainingAmount: "200.00",
      status: "OPEN",
      isOverdue: false,
    });
  });

  it("rejects a consent split that doesn't sum to the shortfall", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();
    await expect(
      TransactionService.recordExpense(
        user.id,
        { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
        permanentConsent(goal.id, "150.00")
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects a per-goal amount exceeding what that goal has reserved on the account", async () => {
    const { user, account, category } = await setupMarriageScenario();
    const travel = await SavingsGoalService.create(user.id, { name: "Travel", targetAmount: "50000.00" });
    // Travel has nothing reserved on this account — typing any amount against it must fail.
    await expect(
      TransactionService.recordExpense(
        user.id,
        { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
        permanentConsent(travel.id, "200.00")
      )
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("splits a shortfall across two goals reserving on the same account", async () => {
    const { user, account, category, goal: marriage } = await setupMarriageScenario();
    const emergency = await SavingsGoalService.create(user.id, { name: "Emergency", targetAmount: "50000.00" });
    // Account currently: balance 10500, 10000 reserved (marriage). Reserve
    // nothing more for emergency — instead re-derive a scenario with two
    // goals sharing the reserve by re-allocating from marriage.
    await SavingsGoalService.moveAllocation(user.id, {
      fromGoalId: marriage.id,
      toGoalId: emergency.id,
      accountId: account.id,
      amount: "4000.00",
    });
    // Now: Marriage reserves 6000, Emergency reserves 4000, unallocated 500.
    // A 700 expense creates a 200 shortfall, split 150/50.
    const expense = await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      {
        concent: true,
        allocations: [
          { goalId: marriage.id, amount: "150.00" },
          { goalId: emergency.id, amount: "50.00" },
        ],
      }
    );

    const events = await prisma.goalAllocationEvent.findMany({ where: { sourceTransactionId: expense.id } });
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.amount.toString()).sort()).toEqual(["-150", "-50"]);
  });

  it("enforces the guard on an outgoing transfer's source account", async () => {
    const { user, account, goal } = await setupMarriageScenario();
    const destination = await createTestAccount(user.id, "0.00");

    await expect(
      TransactionService.recordTransfer(user.id, {
        sourceAccountId: account.id,
        destinationAccountId: destination.id,
        amount: "700.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toMatchObject({ code: "RESERVATION_CONSENT_REQUIRED" });

    await expect(
      TransactionService.recordTransfer(
        user.id,
        {
          sourceAccountId: account.id,
          destinationAccountId: destination.id,
          amount: "700.00",
          transactionDate: new Date("2026-09-01"),
        },
        permanentConsent(goal.id, "200.00")
      )
    ).resolves.toBeDefined();
  });

  it("enforces the guard on an investment contribution", async () => {
    const { user, account, goal } = await setupMarriageScenario();
    const investment = await createTestInvestment(user.id);

    await expect(
      InvestmentService.contribute(user.id, {
        investmentId: investment.id,
        accountId: account.id,
        amount: "700.00",
        transactionDate: new Date("2026-09-01"),
      })
    ).rejects.toMatchObject({ code: "RESERVATION_CONSENT_REQUIRED" });

    await expect(
      InvestmentService.contribute(
        user.id,
        { investmentId: investment.id, accountId: account.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
        permanentConsent(goal.id, "200.00")
      )
    ).resolves.toBeDefined();
  });
});

describe("GoalReservationService — promise lifecycle", () => {
  async function createOpenPromise() {
    const { user, account, category, goal } = await setupMarriageScenario();
    await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      returningConsent(goal.id, "200.00", new Date("2026-10-15"))
    );
    const [promise] = await GoalReservationService.listOpenPromises(user.id);
    return { user, account, goal, promise };
  }

  it("partial return reduces the remaining amount and marks the promise partially resolved", async () => {
    const { user, promise } = await createOpenPromise();
    await GoalReservationService.returnAgainstPromise(user.id, promise.id, "100.00");

    const [refreshed] = await GoalReservationService.listOpenPromises(user.id);
    expect(refreshed.remainingAmount).toBe("100.00");
    expect(refreshed.status).toBe("PARTIALLY_RESOLVED");
  });

  it("full return resolves the promise and removes it from the open list", async () => {
    const { user, promise } = await createOpenPromise();
    await GoalReservationService.returnAgainstPromise(user.id, promise.id, "200.00");

    const openPromises = await GoalReservationService.listOpenPromises(user.id);
    expect(openPromises).toHaveLength(0);
  });

  it("rejects returning more than the remaining amount", async () => {
    const { user, promise } = await createOpenPromise();
    await expect(
      GoalReservationService.returnAgainstPromise(user.id, promise.id, "250.00")
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("writes off the remaining amount without creating a further ledger entry, and removes it from the open list", async () => {
    const { user, goal, promise } = await createOpenPromise();
    await GoalReservationService.writeOffPromise(user.id, promise.id);

    const openPromises = await GoalReservationService.listOpenPromises(user.id);
    expect(openPromises).toHaveLength(0);

    // Written off, not returned: the goal's allocated total stays reduced.
    const progress = await SavingsGoalService.getProgress(user.id, goal.id);
    expect(progress.totalAllocated).toBe("9800.00");
  });

  it("marks a promise overdue once its due date has passed, without any write", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();
    await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      returningConsent(goal.id, "200.00", new Date("2020-01-01"))
    );

    const [promise] = await GoalReservationService.listOpenPromises(user.id);
    expect(promise.isOverdue).toBe(true);
    expect(promise.status).toBe("OPEN");
  });

  it("rejects acting on a promise owned by a different user", async () => {
    const { promise } = await createOpenPromise();
    const otherUser = await createTestUser();
    await expect(
      GoalReservationService.returnAgainstPromise(otherUser.id, promise.id, "50.00")
    ).rejects.toThrow(AppError);
    await expect(GoalReservationService.writeOffPromise(otherUser.id, promise.id)).rejects.toThrow(AppError);
  });
});

describe("GoalReservationService — delete auto-reversal and edit independence", () => {
  it("deleting the transaction that caused a dip reverses the ledger entry and closes any linked promise", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();
    const expense = await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      returningConsent(goal.id, "200.00", new Date("2026-10-15"))
    );

    let progress = await SavingsGoalService.getProgress(user.id, goal.id);
    expect(progress.totalAllocated).toBe("9800.00");

    await TransactionService.delete(user.id, expense.id);

    progress = await SavingsGoalService.getProgress(user.id, goal.id);
    expect(progress.totalAllocated).toBe("10000.00");

    const openPromises = await GoalReservationService.listOpenPromises(user.id);
    expect(openPromises).toHaveLength(0);
  });

  it("editing the transaction's amount leaves the original ledger entry and promise untouched", async () => {
    const { user, account, category, goal } = await setupMarriageScenario();
    const expense = await TransactionService.recordExpense(
      user.id,
      { accountId: account.id, categoryId: category.id, amount: "700.00", transactionDate: new Date("2026-09-01") },
      returningConsent(goal.id, "200.00", new Date("2026-10-15"))
    );

    // Increasing the amount still fits comfortably (account balance is
    // 10500; this only brings the expense to 750) — no new dip.
    await TransactionService.update(user.id, expense.id, { amount: "750.00" });

    const events = await prisma.goalAllocationEvent.findMany({ where: { sourceTransactionId: expense.id } });
    expect(events).toHaveLength(1);
    expect(events[0].amount.toString()).toBe("-200");

    const openPromises = await GoalReservationService.listOpenPromises(user.id);
    expect(openPromises).toHaveLength(1);
    expect(openPromises[0].remainingAmount).toBe("200.00");
  });
});
