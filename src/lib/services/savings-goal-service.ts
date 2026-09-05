import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AccountService, getOwnedAccountOrThrow } from "@/lib/services/account-service";
import type {
  AllocateInput,
  CreateSavingsGoalInput,
  MoveAllocationInput,
  UpdateSavingsGoalInput,
} from "@/lib/validation/savings-goal";

const { Decimal } = Prisma;

async function getOwnedGoalOrThrow(userId: string, goalId: string) {
  const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) {
    throw new AppError("NOT_FOUND", "Savings goal not found.");
  }
  return goal;
}

/** Exported for goal-reservation-service, which needs the same "how much of this account is reserved" math inside its own $transaction. */
export async function sumAllocationsForAccount(
  accountId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const result = await client.goalAllocationEvent.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });
  return new Decimal(result._sum.amount ?? 0);
}

async function sumAllocationsForGoalAccount(goalId: string, accountId: string) {
  const result = await prisma.goalAllocationEvent.aggregate({
    where: { savingsGoalId: goalId, accountId },
    _sum: { amount: true },
  });
  return new Decimal(result._sum.amount ?? 0);
}

export const SavingsGoalService = {
  async create(userId: string, input: CreateSavingsGoalInput) {
    return prisma.savingsGoal.create({
      data: {
        userId,
        name: input.name,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
        description: input.description,
      },
    });
  },

  // Hard-blocks at allocation-creation time only (design.md D3): a later edit
  // to a past transaction that retroactively over-allocates is allowed and
  // surfaced as a warning instead (see getAccountAllocationStatus). All money
  // comparisons use Prisma.Decimal, never native Number, to avoid float
  // precision risk right at this invariant's boundary (PRD Rule 5).
  async allocate(userId: string, input: AllocateInput) {
    await getOwnedGoalOrThrow(userId, input.goalId);
    await getOwnedAccountOrThrow(userId, input.accountId);

    return prisma.$transaction(async (tx) => {
      const balances = await AccountService.computeBalancesFor(userId, [input.accountId]);
      const balance = new Decimal(balances.get(input.accountId) ?? 0);
      const alreadyAllocated = await sumAllocationsForAccount(input.accountId);
      const unallocated = balance.minus(alreadyAllocated);
      const amount = new Decimal(input.amount);

      if (amount.greaterThan(unallocated)) {
        throw new AppError(
          "ALLOCATION_EXCEEDS_BALANCE",
          `Only ${unallocated.toFixed(2)} is unallocated on this account.`,
          { unallocated: unallocated.toFixed(2) }
        );
      }

      return tx.goalAllocationEvent.create({
        data: {
          savingsGoalId: input.goalId,
          accountId: input.accountId,
          amount: input.amount,
          note: input.note,
        },
      });
    });
  },

  async moveAllocation(userId: string, input: MoveAllocationInput) {
    await getOwnedGoalOrThrow(userId, input.fromGoalId);
    await getOwnedGoalOrThrow(userId, input.toGoalId);
    await getOwnedAccountOrThrow(userId, input.accountId);

    const currentlyAllocated = await sumAllocationsForGoalAccount(input.fromGoalId, input.accountId);
    const amount = new Decimal(input.amount);
    if (amount.greaterThan(currentlyAllocated)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Only ${currentlyAllocated.toFixed(2)} is allocated to this goal from this account.`
      );
    }

    return prisma.$transaction(async (tx) => {
      const [debit, credit] = await Promise.all([
        tx.goalAllocationEvent.create({
          data: {
            savingsGoalId: input.fromGoalId,
            accountId: input.accountId,
            amount: amount.negated(),
            note: input.note,
          },
        }),
        tx.goalAllocationEvent.create({
          data: {
            savingsGoalId: input.toGoalId,
            accountId: input.accountId,
            amount: input.amount,
            note: input.note,
          },
        }),
      ]);
      return { debit, credit };
    });
  },

  async getProgress(userId: string, goalId: string) {
    const goal = await getOwnedGoalOrThrow(userId, goalId);

    const events = await prisma.goalAllocationEvent.groupBy({
      by: ["accountId"],
      where: { savingsGoalId: goalId },
      _sum: { amount: true },
    });

    const byAccount = events.map((row) => ({
      accountId: row.accountId,
      amount: new Decimal(row._sum.amount ?? 0).toFixed(2),
    }));
    const totalAllocated = byAccount.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
    const targetAmount = new Decimal(goal.targetAmount);

    return {
      goal,
      totalAllocated: totalAllocated.toFixed(2),
      progressPercent: targetAmount.greaterThan(0)
        ? totalAllocated.dividedBy(targetAmount).times(100).toNumber()
        : 0,
      byAccount,
    };
  },

  async list(userId: string) {
    return prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  },

  // No cross-check against the allocated total (design.md D3): a target may
  // freely move below what's already allocated, which just means the goal is
  // immediately achieved per the derived-achieved-state rule below.
  async update(userId: string, goalId: string, input: UpdateSavingsGoalInput) {
    await getOwnedGoalOrThrow(userId, goalId);
    return prisma.savingsGoal.update({
      where: { id: goalId },
      data: input,
    });
  },

  // Unconditional, mirroring AccountService.archive (design.md D1): does not
  // touch existing GoalAllocationEvent rows, and has no un-archive path.
  async archive(userId: string, goalId: string) {
    await getOwnedGoalOrThrow(userId, goalId);
    return prisma.savingsGoal.update({
      where: { id: goalId },
      data: { status: "ARCHIVED" },
    });
  },

  /** Surfaces the D3 soft invariant: an account can end up with more allocated than its balance after a retroactive transaction edit. */
  async getAccountAllocationStatus(userId: string, accountId: string) {
    await getOwnedAccountOrThrow(userId, accountId);
    const balances = await AccountService.computeBalancesFor(userId, [accountId]);
    const balance = new Decimal(balances.get(accountId) ?? 0);
    const allocated = await sumAllocationsForAccount(accountId);
    const unallocated = balance.minus(allocated);

    return {
      balance: balance.toFixed(2),
      allocated: allocated.toFixed(2),
      unallocated: unallocated.toFixed(2),
      isOverAllocated: unallocated.isNegative(),
    };
  },
};
