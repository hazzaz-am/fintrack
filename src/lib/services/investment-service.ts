import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertChronologicalBalanceNonNegative, getOwnedAccountOrThrow } from "@/lib/services/account-service";
import { enforceReservationGuard } from "@/lib/services/goal-reservation-service";
import type { ReservationConsentInput } from "@/lib/validation/goal-reservation";
import type {
  ContributeInvestmentInput,
  CreateInvestmentInput,
  CreateInvestmentWithContributionInput,
  RecordMaturityOrWithdrawalInput,
  UpdateInvestmentInput,
} from "@/lib/validation/investment";

const { Decimal } = Prisma;

const OPEN_STATUSES = ["PLANNED", "ACTIVE"] as const;

// Computes every investment's derived principal in a single aggregation pass:
//   principal = openingPrincipal + contributions - returns
// (design.md D7, D9). No N+1 query per investment — same shape as
// AccountService.computeBalancesFor.
async function computePrincipals(userId: string, investmentIds?: string[]): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<Array<{ investmentId: string; principal: string }>>`
    SELECT
      i.id AS "investmentId",
      (
        i."openingPrincipal"
        + COALESCE(SUM(CASE WHEN t."type" = 'INVESTMENT_CONTRIBUTION' THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'INVESTMENT_RETURN' THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
      )::text AS "principal"
    FROM "investments" i
    LEFT JOIN "transactions" t ON t."investmentId" = i.id
    WHERE i."userId" = ${userId}
      ${investmentIds && investmentIds.length > 0 ? Prisma.sql`AND i.id IN (${Prisma.join(investmentIds)})` : Prisma.sql``}
    GROUP BY i.id, i."openingPrincipal"
  `;

  return new Map(rows.map((row) => [row.investmentId, row.principal]));
}

// Which account funded each investment's most recent contribution — used
// only to default the "To account" selector when recording a maturity or
// withdrawal (bug: it previously defaulted to the user's first account
// regardless of which account actually funded the investment). An investment
// can be contributed to from different accounts over time, so there's no
// single "the" funding account in general; the most recent one is the most
// useful default, and the field stays editable either way.
async function getLastContributionAccountIds(userId: string, investmentIds?: string[]): Promise<Map<string, string>> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: "INVESTMENT_CONTRIBUTION",
      investmentId: investmentIds && investmentIds.length > 0 ? { in: investmentIds } : { not: null },
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { investmentId: true, accountId: true },
  });

  const byInvestment = new Map<string, string>();
  for (const row of rows) {
    // Ascending order means the last write for a given investmentId is its
    // most recent contribution.
    if (row.investmentId && row.accountId) byInvestment.set(row.investmentId, row.accountId);
  }
  return byInvestment;
}

async function getOwnedInvestmentOrThrow(userId: string, investmentId: string) {
  const investment = await prisma.investment.findUnique({ where: { id: investmentId } });
  if (!investment || investment.userId !== userId) {
    throw new AppError("NOT_FOUND", "Investment not found.");
  }
  return investment;
}

async function getOrCreateInvestmentReturnCategory(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.category.findFirst({
    where: { userId, name: "Investment Return", type: "INCOME" },
  });
  if (existing) return existing;
  return tx.category.create({ data: { userId, name: "Investment Return", type: "INCOME" } });
}

function daysUntil(date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export const InvestmentService = {
  // A non-zero openingPrincipal means the investment is already funded (e.g.
  // a pre-existing asset like real estate) and starts Active; otherwise it
  // starts Planned until a contribution is recorded (see contribute()).
  async create(userId: string, input: CreateInvestmentInput) {
    const openingPrincipal = new Decimal(input.openingPrincipal);
    return prisma.investment.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        institution: input.institution,
        openingPrincipal: input.openingPrincipal,
        startDate: input.startDate,
        maturityDate: input.maturityDate,
        expectedReturnAmount: input.expectedReturnAmount,
        expectedReturnRate: input.expectedReturnRate,
        currentValue: input.currentValue,
        notes: input.notes,
        status: openingPrincipal.greaterThan(0) ? "ACTIVE" : "PLANNED",
      },
    });
  },

  async createWithInitialContribution(
    userId: string,
    input: CreateInvestmentWithContributionInput,
    consent?: ReservationConsentInput
  ) {
    if (input.accountId && input.contributionAmount) {
      await getOwnedAccountOrThrow(userId, input.accountId);
    }

    return prisma.$transaction(async (tx) => {
      const openingPrincipal = new Decimal(input.openingPrincipal);
      const investment = await tx.investment.create({
        data: {
          userId,
          name: input.name,
          type: input.type,
          institution: input.institution,
          openingPrincipal: input.openingPrincipal,
          startDate: input.startDate,
          maturityDate: input.maturityDate,
          expectedReturnAmount: input.expectedReturnAmount,
          expectedReturnRate: input.expectedReturnRate,
          currentValue: input.currentValue,
          notes: input.notes,
          status: openingPrincipal.greaterThan(0) || input.contributionAmount ? "ACTIVE" : "PLANNED",
        },
      });

      if (input.accountId && input.contributionAmount) {
        const contribution = await tx.transaction.create({
          data: {
            userId,
            accountId: input.accountId,
            investmentId: investment.id,
            type: "INVESTMENT_CONTRIBUTION",
            amount: input.contributionAmount,
            transactionDate: input.startDate,
          },
        });
        await assertChronologicalBalanceNonNegative(tx, userId, input.accountId, contribution);
        await enforceReservationGuard(
          tx,
          userId,
          contribution.id,
          input.accountId,
          input.contributionAmount,
          null,
          consent
        );
      }

      return investment;
    });
  },

  async update(userId: string, investmentId: string, input: UpdateInvestmentInput) {
    await getOwnedInvestmentOrThrow(userId, investmentId);
    return prisma.investment.update({
      where: { id: investmentId },
      data: input,
    });
  },

  // Multiple contributions to the same investment from different accounts
  // over time are ordinary ledger rows (design.md D7) — no special casing
  // for recurring (DPS-style) contributions.
  async contribute(userId: string, input: ContributeInvestmentInput, consent?: ReservationConsentInput) {
    const investment = await getOwnedInvestmentOrThrow(userId, input.investmentId);
    await getOwnedAccountOrThrow(userId, input.accountId);

    if (!OPEN_STATUSES.includes(investment.status as (typeof OPEN_STATUSES)[number])) {
      throw new AppError("INVESTMENT_NOT_ACTIVE", "Cannot contribute to a matured, withdrawn, or cancelled investment.");
    }

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          investmentId: input.investmentId,
          type: "INVESTMENT_CONTRIBUTION",
          amount: input.amount,
          transactionDate: input.transactionDate,
          description: input.description,
        },
      });

      await assertChronologicalBalanceNonNegative(tx, userId, input.accountId, transaction);
      await enforceReservationGuard(tx, userId, transaction.id, input.accountId, input.amount, null, consent);

      if (investment.status === "PLANNED") {
        await tx.investment.update({ where: { id: investment.id }, data: { status: "ACTIVE" } });
      }

      return transaction;
    });
  },

  // Status only transitions here, on an explicit user action (design.md D8) —
  // never automatically when maturityDate passes. Principal and profit are
  // always two distinct transactions (design.md D6, PRD Rule 4).
  async recordMaturityOrWithdrawal(userId: string, input: RecordMaturityOrWithdrawalInput) {
    const investment = await getOwnedInvestmentOrThrow(userId, input.investmentId);
    await getOwnedAccountOrThrow(userId, input.accountId);

    if (investment.status !== "ACTIVE") {
      throw new AppError("INVESTMENT_NOT_ACTIVE", "Only an active investment can have a maturity or withdrawal recorded.");
    }

    return prisma.$transaction(async (tx) => {
      const principals = await computePrincipals(userId, [input.investmentId]);
      const currentPrincipal = new Decimal(principals.get(input.investmentId) ?? 0);
      const principalAmount = new Decimal(input.principalAmount);

      if (principalAmount.greaterThan(currentPrincipal)) {
        throw new AppError(
          "PRINCIPAL_EXCEEDS_AVAILABLE",
          `Only ${currentPrincipal.toFixed(2)} of principal is available on this investment.`,
          { available: currentPrincipal.toFixed(2) }
        );
      }

      const returnTransaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          investmentId: input.investmentId,
          type: "INVESTMENT_RETURN",
          amount: input.principalAmount,
          transactionDate: input.transactionDate,
          description: input.description,
        },
      });

      let incomeTransaction = null;
      const profitAmount = input.profitAmount ? new Decimal(input.profitAmount) : new Decimal(0);
      if (profitAmount.greaterThan(0)) {
        const category = await getOrCreateInvestmentReturnCategory(tx, userId);
        incomeTransaction = await tx.transaction.create({
          data: {
            userId,
            accountId: input.accountId,
            categoryId: category.id,
            type: "INCOME",
            amount: profitAmount.toFixed(2),
            transactionDate: input.transactionDate,
            description: input.description,
          },
        });
      }

      const updated = await tx.investment.update({
        where: { id: investment.id },
        data: { status: input.newStatus },
      });

      return { investment: updated, returnTransaction, incomeTransaction };
    });
  },

  async getPrincipal(userId: string, investmentId: string): Promise<string> {
    await getOwnedInvestmentOrThrow(userId, investmentId);
    const principals = await computePrincipals(userId, [investmentId]);
    return principals.get(investmentId) ?? "0.00";
  },

  async listWithPrincipal(userId: string) {
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    const principals = await computePrincipals(userId);

    return investments.map((investment) => ({
      ...investment,
      openingPrincipal: investment.openingPrincipal.toString(),
      principal: principals.get(investment.id) ?? investment.openingPrincipal.toString(),
    }));
  },

  // Excludes Matured/Withdrawn/Cancelled — an overdue-but-still-Active
  // investment surfaces with a negative daysUntilMaturity (design.md D8),
  // it is never auto-transitioned.
  async getUpcomingMaturities(userId: string) {
    const investments = await prisma.investment.findMany({
      where: { userId, status: "ACTIVE", maturityDate: { not: null } },
      orderBy: { maturityDate: "asc" },
    });

    return investments.map((investment) => ({
      ...investment,
      openingPrincipal: investment.openingPrincipal.toString(),
      daysUntilMaturity: daysUntil(investment.maturityDate as Date),
    }));
  },

  // Totals are computed from the same single grouped query as
  // listWithPrincipal, then reduced in JS — the same pattern
  // SavingsGoalService.getProgress uses to sum a small, already-fetched
  // per-user result set (no separate DB aggregate round trip needed).
  async getTotals(userId: string) {
    const investments = await prisma.investment.findMany({
      where: { userId, status: "ACTIVE" },
    });
    const principals = await computePrincipals(
      userId,
      investments.map((investment) => investment.id)
    );

    let totalInvested = new Decimal(0);
    let currentEstimatedValue = new Decimal(0);
    for (const investment of investments) {
      totalInvested = totalInvested.plus(principals.get(investment.id) ?? 0);
      currentEstimatedValue = currentEstimatedValue.plus(investment.currentValue ?? investment.openingPrincipal);
    }

    return {
      totalInvested: totalInvested.toFixed(2),
      currentEstimatedValue: currentEstimatedValue.toFixed(2),
      expectedProfit: currentEstimatedValue.minus(totalInvested).toFixed(2),
    };
  },

  /** Internal helper for other services (e.g. a future dashboard) that need investment principals without an extra round trip. */
  computePrincipalsFor: computePrincipals,

  /** Internal helper for the Investments page: the account of each investment's most recent contribution, to default the maturity/withdrawal "To account" selector sensibly. */
  getLastContributionAccountIds,
};
