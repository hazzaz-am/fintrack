import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getOwnedAccountOrThrow } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import type {
  DateRangeFilterInput,
  RecordIncomeOrExpenseInput,
  RecordTransferInput,
  TransactionSearchInput,
  UpdateTransactionInput,
} from "@/lib/validation/transaction";

export interface TransactionListItem {
  id: string;
  type: string;
  amount: string;
  vatAmount: string | null;
  description: string | null;
  transactionDate: Date;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sourceAccountName: string | null;
  destinationAccountName: string | null;
}

export interface PaginatedTransactions {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

async function getOwnedTransactionOrThrow(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction || transaction.userId !== userId) {
    throw new AppError("NOT_FOUND", "Transaction not found.");
  }
  return transaction;
}

async function recordIncomeOrExpense(
  userId: string,
  type: "INCOME" | "EXPENSE",
  input: RecordIncomeOrExpenseInput
) {
  await getOwnedAccountOrThrow(userId, input.accountId);
  await CategoryService.getOwnedOfType(userId, input.categoryId, type);

  return prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type,
      amount: input.amount,
      // VAT only applies to expenses — it's ignored for income even if sent.
      vatAmount: type === "EXPENSE" ? input.vatAmount : undefined,
      transactionDate: input.transactionDate,
      description: input.description,
    },
  });
}

export const TransactionService = {
  recordIncome(userId: string, input: RecordIncomeOrExpenseInput) {
    return recordIncomeOrExpense(userId, "INCOME", input);
  },

  recordExpense(userId: string, input: RecordIncomeOrExpenseInput) {
    return recordIncomeOrExpense(userId, "EXPENSE", input);
  },

  async recordTransfer(userId: string, input: RecordTransferInput) {
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new AppError("INVALID_TRANSFER", "Source and destination accounts must differ.");
    }

    return prisma.$transaction(async (tx) => {
      const [source, destination] = await Promise.all([
        tx.account.findUnique({ where: { id: input.sourceAccountId } }),
        tx.account.findUnique({ where: { id: input.destinationAccountId } }),
      ]);
      if (!source || source.userId !== userId) {
        throw new AppError("NOT_FOUND", "Source account not found.");
      }
      if (!destination || destination.userId !== userId) {
        throw new AppError("NOT_FOUND", "Destination account not found.");
      }

      return tx.transaction.create({
        data: {
          userId,
          type: "TRANSFER",
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          amount: input.amount,
          vatAmount: input.vatAmount,
          transactionDate: input.transactionDate,
          description: input.description,
        },
      });
    });
  },

  async update(userId: string, transactionId: string, input: UpdateTransactionInput) {
    const existing = await getOwnedTransactionOrThrow(userId, transactionId);

    if (input.categoryId) {
      if (existing.type === "TRANSFER") {
        throw new AppError("VALIDATION_ERROR", "Transfers cannot have a category.");
      }
      await CategoryService.getOwnedOfType(userId, input.categoryId, existing.type as "INCOME" | "EXPENSE");
    }

    if (input.vatAmount !== undefined && existing.type === "INCOME") {
      throw new AppError("VALIDATION_ERROR", "Income transactions cannot have VAT.");
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId: input.categoryId,
        amount: input.amount,
        vatAmount: input.vatAmount,
        transactionDate: input.transactionDate,
        description: input.description,
      },
    });
  },

  async delete(userId: string, transactionId: string) {
    await getOwnedTransactionOrThrow(userId, transactionId);
    await prisma.transaction.delete({ where: { id: transactionId } });
  },

  async list(userId: string, filter: DateRangeFilterInput) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filter.from || filter.to) {
      where.transactionDate = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    if (filter.type) where.type = filter.type;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.accountId) {
      where.OR = [
        { accountId: filter.accountId },
        { sourceAccountId: filter.accountId },
        { destinationAccountId: filter.accountId },
      ];
    }

    return prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
    });
  },

  // Additive: new method for the Transactions screen's search/sort/pagination
  // (transactions-ui spec) — `list` above is untouched and keeps its existing
  // callers' behavior exactly as-is. Search/sort/pagination happen in the
  // database query (skip/take/orderBy/contains), not by fetching everything
  // and slicing in memory, following the same "aggregate in the DB" principle
  // as getSummary/AnalyticsService.
  async listPaginated(userId: string, filter: TransactionSearchInput): Promise<PaginatedTransactions> {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filter.from || filter.to) {
      where.transactionDate = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    if (filter.type) where.type = filter.type;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.accountId) {
      where.OR = [
        { accountId: filter.accountId },
        { sourceAccountId: filter.accountId },
        { destinationAccountId: filter.accountId },
      ];
    }
    if (filter.search) {
      where.description = { contains: filter.search, mode: "insensitive" };
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const sortBy = filter.sortBy ?? "transactionDate";
    const sortDir = filter.sortDir ?? "desc";

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          account: { select: { name: true } },
          category: { select: { name: true } },
          sourceAccount: { select: { name: true } },
          destinationAccount: { select: { name: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const items: TransactionListItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount.toString(),
      vatAmount: row.vatAmount?.toString() ?? null,
      description: row.description,
      transactionDate: row.transactionDate,
      accountId: row.accountId,
      accountName: row.account?.name ?? null,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      sourceAccountName: row.sourceAccount?.name ?? null,
      destinationAccountName: row.destinationAccount?.name ?? null,
    }));

    return { items, total, page, pageSize };
  },

  // Expense (and net cash flow) include VAT — vatAmount is deducted from the
  // paying account the same as amount (AccountService.computeBalances), so
  // the total shown here must match that, not just sum `amount` (design.md D1).
  async getSummary(userId: string, range: { from: Date; to: Date }) {
    const rows = await prisma.$queryRaw<Array<{ income: string; expense: string; expenseVat: string; netCashFlow: string }>>`
      SELECT
        COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "income",
        COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" + COALESCE("vatAmount", 0::numeric(14,2)) ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "expense",
        COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN COALESCE("vatAmount", 0::numeric(14,2)) ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "expenseVat",
        (
          COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
          - COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" + COALESCE("vatAmount", 0::numeric(14,2)) ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        )::text AS "netCashFlow"
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND "transactionDate" >= ${range.from}
        AND "transactionDate" <= ${range.to}
    `;

    return rows[0] ?? { income: "0.00", expense: "0.00", expenseVat: "0.00", netCashFlow: "0.00" };
  },
};
