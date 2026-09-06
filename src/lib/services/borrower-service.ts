import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AccountService, assertChronologicalBalanceNonNegative, getOwnedAccountOrThrow } from "@/lib/services/account-service";
import { sumAllocationsForAccount } from "@/lib/services/savings-goal-service";
import type {
  CreateBorrowerInput,
  DisburseLoanInput,
  RecordRepaymentInput,
  UpdateBorrowerInput,
} from "@/lib/validation/borrower";

const { Decimal } = Prisma;

const CLOSED_STATUSES = ["REPAID", "WRITTEN_OFF"] as const;

async function getOwnedBorrowerOrThrow(userId: string, borrowerId: string) {
  const borrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
  if (!borrower || borrower.userId !== userId) {
    throw new AppError("NOT_FOUND", "Borrower not found.");
  }
  return borrower;
}

async function getOwnedLoanOrThrow(userId: string, loanId: string) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.userId !== userId) {
    throw new AppError("NOT_FOUND", "Loan not found.");
  }
  return loan;
}

// A loan's derived money shape, read entirely off its linked Transaction rows
// (design.md D1 revision) — the disbursed amount from the single
// LOAN_DISBURSEMENT row, and cumulative repayments from every LOAN_REPAYMENT
// row sharing its loanId. No amount ever stored on Loan itself.
async function computeLoanAmounts(loanId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await client.transaction.groupBy({
    by: ["type"],
    where: { loanId, type: { in: ["LOAN_DISBURSEMENT", "LOAN_REPAYMENT"] } },
    _sum: { amount: true },
  });

  let disbursed = new Decimal(0);
  let repaid = new Decimal(0);
  for (const row of rows) {
    if (row.type === "LOAN_DISBURSEMENT") disbursed = new Decimal(row._sum.amount ?? 0);
    if (row.type === "LOAN_REPAYMENT") repaid = new Decimal(row._sum.amount ?? 0);
  }
  return { disbursed, repaid, outstanding: disbursed.minus(repaid) };
}

function isOverdue(dueDate: Date, outstanding: Prisma.Decimal, status: string): boolean {
  return status !== "WRITTEN_OFF" && outstanding.greaterThan(0) && dueDate.getTime() < Date.now();
}

// Bulk version of computeLoanAmounts for a list screen — one aggregation
// pass over every loan requested, no N+1 query per loan (same shape as
// InvestmentService.computePrincipals).
async function computeLoanAmountsForMany(loanIds: string[]): Promise<Map<string, { disbursed: Prisma.Decimal; outstanding: Prisma.Decimal }>> {
  if (loanIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<Array<{ loanId: string; disbursed: string; outstanding: string }>>`
    SELECT
      l.id AS "loanId",
      COALESCE(SUM(CASE WHEN t."type" = 'LOAN_DISBURSEMENT' THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "disbursed",
      (
        COALESCE(SUM(CASE WHEN t."type" = 'LOAN_DISBURSEMENT' THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'LOAN_REPAYMENT' THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
      )::text AS "outstanding"
    FROM "loans" l
    LEFT JOIN "transactions" t ON t."loanId" = l.id
    WHERE l.id IN (${Prisma.join(loanIds)})
    GROUP BY l.id
  `;

  return new Map(rows.map((row) => [row.loanId, { disbursed: new Decimal(row.disbursed), outstanding: new Decimal(row.outstanding) }]));
}

export const BorrowerService = {
  async create(userId: string, input: CreateBorrowerInput) {
    return prisma.borrower.create({
      data: { userId, name: input.name, notes: input.notes },
    });
  },

  async update(userId: string, borrowerId: string, input: UpdateBorrowerInput) {
    await getOwnedBorrowerOrThrow(userId, borrowerId);
    return prisma.borrower.update({
      where: { id: borrowerId },
      data: input,
    });
  },

  // Hard cap (design.md D2): checked strictly after the existing
  // insufficient-balance check, with no consent override, unlike
  // goal-reservation-guard's dip-with-consent flow for other transaction types.
  async disburseLoan(userId: string, input: DisburseLoanInput) {
    await getOwnedBorrowerOrThrow(userId, input.borrowerId);
    await getOwnedAccountOrThrow(userId, input.accountId);

    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          userId,
          borrowerId: input.borrowerId,
          dueDate: input.dueDate,
          status: "OPEN",
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          loanId: loan.id,
          type: "LOAN_DISBURSEMENT",
          amount: input.amount,
          transactionDate: input.disbursedDate,
          description: input.description,
        },
      });

      await assertChronologicalBalanceNonNegative(tx, userId, input.accountId, transaction);

      const balances = await AccountService.computeBalancesFor(userId, [input.accountId]);
      const balance = new Decimal(balances.get(input.accountId) ?? 0);
      const alreadyAllocated = await sumAllocationsForAccount(input.accountId);
      const unallocated = balance.minus(alreadyAllocated);
      const amount = new Decimal(input.amount);

      if (amount.greaterThan(unallocated)) {
        throw new AppError(
          "LOAN_EXCEEDS_UNALLOCATED_BALANCE",
          `Only ${unallocated.toFixed(2)} is unallocated on this account.`,
          { unallocated: unallocated.toFixed(2) }
        );
      }

      return { loan, transaction };
    });
  },

  async recordRepayment(userId: string, input: RecordRepaymentInput) {
    await getOwnedAccountOrThrow(userId, input.accountId);

    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id: input.loanId } });
      if (!loan || loan.userId !== userId) {
        throw new AppError("NOT_FOUND", "Loan not found.");
      }
      if (CLOSED_STATUSES.includes(loan.status as (typeof CLOSED_STATUSES)[number])) {
        throw new AppError("LOAN_ALREADY_CLOSED", "This loan is already closed.");
      }

      const { outstanding } = await computeLoanAmounts(loan.id, tx);
      const amount = new Decimal(input.amount);
      if (amount.greaterThan(outstanding)) {
        throw new AppError(
          "REPAYMENT_EXCEEDS_OUTSTANDING",
          `Only ${outstanding.toFixed(2)} remains outstanding on this loan.`,
          { outstanding: outstanding.toFixed(2) }
        );
      }

      await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          loanId: loan.id,
          type: "LOAN_REPAYMENT",
          amount: input.amount,
          transactionDate: input.transactionDate,
          description: input.description,
        },
      });

      const newOutstanding = outstanding.minus(amount);
      const updated = await tx.loan.update({
        where: { id: loan.id },
        data: { status: newOutstanding.isZero() ? "REPAID" : "PARTIALLY_REPAID" },
      });

      return { ...updated, outstanding: newOutstanding.toFixed(2) };
    });
  },

  async writeOffLoan(userId: string, loanId: string) {
    const loan = await getOwnedLoanOrThrow(userId, loanId);
    if (CLOSED_STATUSES.includes(loan.status as (typeof CLOSED_STATUSES)[number])) {
      throw new AppError("LOAN_ALREADY_CLOSED", "This loan is already closed.");
    }

    const { outstanding } = await computeLoanAmounts(loanId);
    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: { status: "WRITTEN_OFF" },
    });

    return { ...updated, outstanding: outstanding.toFixed(2) };
  },

  async updateDueDate(userId: string, loanId: string, dueDate: Date) {
    await getOwnedLoanOrThrow(userId, loanId);
    return prisma.loan.update({
      where: { id: loanId },
      data: { dueDate },
    });
  },

  async listLoansForBorrower(userId: string, borrowerId: string) {
    await getOwnedBorrowerOrThrow(userId, borrowerId);
    const loans = await prisma.loan.findMany({
      where: { borrowerId },
      orderBy: { createdAt: "asc" },
    });
    const amounts = await computeLoanAmountsForMany(loans.map((loan) => loan.id));

    return loans.map((loan) => {
      const { disbursed, outstanding } = amounts.get(loan.id) ?? { disbursed: new Decimal(0), outstanding: new Decimal(0) };
      return {
        ...loan,
        amount: disbursed.toFixed(2),
        outstanding: outstanding.toFixed(2),
        isOverdue: isOverdue(loan.dueDate, outstanding, loan.status),
      };
    });
  },

  // Every loan across every one of the user's borrowers, in two queries
  // total (not one per borrower) — backs the Borrowers screen's per-borrower
  // expandable loan history.
  async listAllLoans(userId: string) {
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    const amounts = await computeLoanAmountsForMany(loans.map((loan) => loan.id));

    return loans.map((loan) => {
      const { disbursed, outstanding } = amounts.get(loan.id) ?? { disbursed: new Decimal(0), outstanding: new Decimal(0) };
      return {
        ...loan,
        amount: disbursed.toFixed(2),
        outstanding: outstanding.toFixed(2),
        isOverdue: isOverdue(loan.dueDate, outstanding, loan.status),
      };
    });
  },

  // Aggregate outstanding per borrower via one grouped query, no N+1 per
  // borrower — same shape as AccountService.listWithBalances. Written-off
  // loans are excluded from the sum: their per-loan outstanding is preserved
  // for record-keeping (see writeOffLoan), but a write-off means that money
  // is no longer expected back, so it shouldn't inflate what still reads as
  // a live, collectible total for this borrower.
  async listWithOutstanding(userId: string) {
    const borrowers = await prisma.borrower.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const rows = await prisma.$queryRaw<Array<{ borrowerId: string; totalOutstanding: string }>>`
      SELECT
        l."borrowerId" AS "borrowerId",
        COALESCE(SUM(
          CASE WHEN t."type" = 'LOAN_DISBURSEMENT' THEN t."amount" ELSE 0::numeric(14,2) END
          - CASE WHEN t."type" = 'LOAN_REPAYMENT' THEN t."amount" ELSE 0::numeric(14,2) END
        ), 0::numeric(14,2))::text AS "totalOutstanding"
      FROM "loans" l
      LEFT JOIN "transactions" t ON t."loanId" = l.id
      WHERE l."userId" = ${userId} AND l."status" != 'WRITTEN_OFF'
      GROUP BY l."borrowerId"
    `;
    const outstandingByBorrower = new Map(rows.map((row) => [row.borrowerId, row.totalOutstanding]));

    return borrowers.map((borrower) => ({
      ...borrower,
      totalOutstanding: outstandingByBorrower.get(borrower.id) ?? "0.00",
    }));
  },

  /** Internal helper for TransactionService's immutability carve-out. */
  computeLoanAmountsFor: computeLoanAmounts,
};
