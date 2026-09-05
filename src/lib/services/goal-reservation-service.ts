import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { sumAllocationsForAccount } from "@/lib/services/savings-goal-service";
import type { ReservationConsentInput } from "@/lib/validation/goal-reservation";

const { Decimal } = Prisma;

/** Whatever `new Decimal(...)` accepts — Prisma's `Decimal.Value` type isn't reachable through the `Prisma` namespace in this version. */
type MoneyValue = string | number | Prisma.Decimal;

export interface ReservationGoalOption {
  goalId: string;
  goalName: string;
  /** How much this goal currently has reserved on this specific account — the per-goal cap on its typed shortfall share. */
  reserved: string;
}

export interface ReservationShortfall {
  /** Zero when the outflow doesn't dip into any reserve — callers should treat that as "no consent needed". */
  shortfall: string;
  unallocated: string;
  goals: ReservationGoalOption[];
}

/**
 * Computes whether `amount + vatAmount` leaving `accountId` would dip into
 * money already reserved by savings goals on that account (goal-reservation-guard
 * spec, "Detect a Reserved-Funds Shortfall on New Outflow Transactions").
 * Reads via the plain client (never a `tx`) so it always reflects the
 * account's state *before* the outflow being checked — the same pattern
 * `SavingsGoalService.allocate` already uses for its own unallocated-balance
 * check.
 */
export async function computeShortfall(
  userId: string,
  accountId: string,
  amount: MoneyValue,
  vatAmount: MoneyValue = 0
): Promise<ReservationShortfall> {
  const balances = await AccountService.computeBalancesFor(userId, [accountId]);
  const balance = new Decimal(balances.get(accountId) ?? 0);
  const alreadyAllocated = await sumAllocationsForAccount(accountId);
  const unallocated = balance.minus(alreadyAllocated);
  const outflow = new Decimal(amount).plus(vatAmount ?? 0);
  const shortfall = Decimal.max(0, outflow.minus(unallocated));

  let goals: ReservationGoalOption[] = [];
  if (shortfall.greaterThan(0)) {
    const rows = await prisma.goalAllocationEvent.groupBy({
      by: ["savingsGoalId"],
      where: { accountId },
      _sum: { amount: true },
    });
    const reservingGoalIds = rows
      .filter((row) => new Decimal(row._sum.amount ?? 0).greaterThan(0))
      .map((row) => ({ id: row.savingsGoalId, reserved: new Decimal(row._sum.amount ?? 0) }));

    if (reservingGoalIds.length > 0) {
      const goalRecords = await prisma.savingsGoal.findMany({
        where: { id: { in: reservingGoalIds.map((row) => row.id) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(goalRecords.map((goal) => [goal.id, goal.name]));
      goals = reservingGoalIds.map((row) => ({
        goalId: row.id,
        goalName: nameById.get(row.id) ?? "Unknown goal",
        reserved: row.reserved.toFixed(2),
      }));
    }
  }

  return { shortfall: shortfall.toFixed(2), unallocated: unallocated.toFixed(2), goals };
}

/**
 * Validates and applies a Step 2 consent submission inside the caller's own
 * `prisma.$transaction`, after the underlying transaction row has already
 * been created and passed the insufficient-balance check. Throws (rolling
 * back the whole transaction, same as any other AppError inside a
 * `$transaction` callback in this codebase) if the split doesn't check out.
 */
export async function applyReservationConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  sourceTransactionId: string,
  accountId: string,
  shortfall: MoneyValue,
  consent: ReservationConsentInput
): Promise<void> {
  const shortfallAmount = new Decimal(shortfall);
  const goalIds = consent.allocations.map((a) => a.goalId);

  const goals = await tx.savingsGoal.findMany({ where: { id: { in: goalIds } } });
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  for (const allocation of consent.allocations) {
    const goal = goalById.get(allocation.goalId);
    if (!goal || goal.userId !== userId) {
      throw new AppError("NOT_FOUND", "Savings goal not found.");
    }
  }

  const typedSum = consent.allocations.reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  if (!typedSum.equals(shortfallAmount)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `The selected goals' amounts must sum to exactly ${shortfallAmount.toFixed(2)}.`
    );
  }

  for (const allocation of consent.allocations) {
    const goalReservedResult = await tx.goalAllocationEvent.aggregate({
      where: { savingsGoalId: allocation.goalId, accountId },
      _sum: { amount: true },
    });
    const goalReserved = new Decimal(goalReservedResult._sum.amount ?? 0);
    const amount = new Decimal(allocation.amount);
    if (amount.greaterThan(goalReserved)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Only ${goalReserved.toFixed(2)} is reserved for "${goalById.get(allocation.goalId)?.name}" on this account.`
      );
    }

    let promiseId: string | null = null;
    if (allocation.returnBy) {
      const promise = await tx.goalReservationPromise.create({
        data: {
          userId,
          savingsGoalId: allocation.goalId,
          accountId,
          amount: amount.toFixed(2),
          remainingAmount: amount.toFixed(2),
          dueDate: allocation.returnBy,
          status: "OPEN",
        },
      });
      promiseId = promise.id;
    }

    await tx.goalAllocationEvent.create({
      data: {
        savingsGoalId: allocation.goalId,
        accountId,
        amount: amount.negated().toFixed(2),
        sourceTransactionId,
        promiseId,
      },
    });
  }
}

/**
 * Called when a transaction that may have triggered this guard is deleted
 * (goal-reservation-guard spec, "Deleting a Transaction Reverses Its
 * Reservation Effects"). Reverses every linked negative event with a
 * matching positive one and closes any promise it originated — the dip's
 * cause no longer exists, so nothing is left to return against.
 */
export async function reverseForTransaction(
  tx: Prisma.TransactionClient,
  transactionId: string
): Promise<void> {
  const events = await tx.goalAllocationEvent.findMany({ where: { sourceTransactionId: transactionId } });
  if (events.length === 0) return;

  for (const event of events) {
    await tx.goalAllocationEvent.create({
      data: {
        savingsGoalId: event.savingsGoalId,
        accountId: event.accountId,
        amount: event.amount.negated(),
        note: "Reversal of a deleted transaction's reserved-funds dip.",
      },
    });

    if (event.promiseId) {
      await tx.goalReservationPromise.updateMany({
        where: { id: event.promiseId, status: { in: ["OPEN", "PARTIALLY_RESOLVED"] } },
        data: { remainingAmount: 0, status: "RESOLVED" },
      });
    }
  }
}

async function getOwnedPromiseOrThrow(userId: string, promiseId: string) {
  const promise = await prisma.goalReservationPromise.findUnique({ where: { id: promiseId } });
  if (!promise || promise.userId !== userId) {
    throw new AppError("NOT_FOUND", "Reservation promise not found.");
  }
  return promise;
}

export const GoalReservationService = {
  computeShortfall,

  /** Partial or full return against an open promise (goal-reservation-guard spec, "Reservation Promise Lifecycle"). */
  async returnAgainstPromise(userId: string, promiseId: string, amount: MoneyValue) {
    return prisma.$transaction(async (tx) => {
      const promise = await getOwnedPromiseOrThrow(userId, promiseId);
      if (promise.status === "RESOLVED" || promise.status === "WRITTEN_OFF") {
        throw new AppError("VALIDATION_ERROR", "This promise is already closed.");
      }

      const returnAmount = new Decimal(amount);
      const remaining = new Decimal(promise.remainingAmount);
      if (returnAmount.greaterThan(remaining)) {
        throw new AppError("VALIDATION_ERROR", `Only ${remaining.toFixed(2)} remains outstanding on this promise.`);
      }

      await tx.goalAllocationEvent.create({
        data: {
          savingsGoalId: promise.savingsGoalId,
          accountId: promise.accountId,
          amount: returnAmount.toFixed(2),
          promiseId: promise.id,
        },
      });

      const newRemaining = remaining.minus(returnAmount);
      return tx.goalReservationPromise.update({
        where: { id: promise.id },
        data: {
          remainingAmount: newRemaining.toFixed(2),
          status: newRemaining.isZero() ? "RESOLVED" : "PARTIALLY_RESOLVED",
        },
      });
    });
  },

  /** Closes a promise for whatever `remainingAmount` is still outstanding, with no further ledger entry (goal-reservation-guard spec). */
  async writeOffPromise(userId: string, promiseId: string) {
    const promise = await getOwnedPromiseOrThrow(userId, promiseId);
    if (promise.status === "RESOLVED" || promise.status === "WRITTEN_OFF") {
      throw new AppError("VALIDATION_ERROR", "This promise is already closed.");
    }
    return prisma.goalReservationPromise.update({
      where: { id: promiseId },
      data: { status: "WRITTEN_OFF" },
    });
  },

  /** Feeds the dashboard reservation banner (dashboard-ui spec, "Dashboard shows a reserved-funds return banner"). `isOverdue` is derived here, never stored. */
  async listOpenPromises(userId: string) {
    const promises = await prisma.goalReservationPromise.findMany({
      where: { userId, status: { in: ["OPEN", "PARTIALLY_RESOLVED"] } },
      orderBy: { dueDate: "asc" },
      include: { savingsGoal: { select: { name: true } } },
    });
    const now = new Date();
    return promises.map((promise) => ({
      id: promise.id,
      savingsGoalId: promise.savingsGoalId,
      goalName: promise.savingsGoal.name,
      accountId: promise.accountId,
      amount: promise.amount.toFixed(2),
      remainingAmount: promise.remainingAmount.toFixed(2),
      dueDate: promise.dueDate,
      status: promise.status,
      isOverdue: promise.dueDate.getTime() < now.getTime(),
    }));
  },
};
