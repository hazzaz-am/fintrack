import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validation/account";

export interface AccountWithBalance {
  id: string;
  userId: string;
  name: string;
  institution: string | null;
  type: string;
  openingBalance: string;
  currency: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  balance: string;
}

// Computes every account's balance in a single aggregation pass:
//   balance = openingBalance + income - expense + transfers in - transfers out
// (design.md D1). No N+1 query per account.
async function computeBalances(userId: string, accountIds?: string[]): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<Array<{ accountId: string; balance: string }>>`
    SELECT
      a.id AS "accountId",
      (
        a."openingBalance"
        + COALESCE(SUM(CASE WHEN t."type" = 'INCOME' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        + COALESCE(SUM(CASE WHEN t."type" = 'TRANSFER' AND t."destinationAccountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'TRANSFER' AND t."sourceAccountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
      )::text AS "balance"
    FROM "accounts" a
    LEFT JOIN "transactions" t
      ON t."userId" = a."userId"
      AND (t."accountId" = a.id OR t."sourceAccountId" = a.id OR t."destinationAccountId" = a.id)
    WHERE a."userId" = ${userId}
      ${accountIds && accountIds.length > 0 ? Prisma.sql`AND a.id IN (${Prisma.join(accountIds)})` : Prisma.sql``}
    GROUP BY a.id, a."openingBalance"
  `;

  return new Map(rows.map((row) => [row.accountId, row.balance]));
}

export async function getOwnedAccountOrThrow(userId: string, accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId) {
    throw new AppError("NOT_FOUND", "Account not found.");
  }
  return account;
}

export const AccountService = {
  async create(userId: string, input: CreateAccountInput) {
    return prisma.account.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        institution: input.institution,
        openingBalance: input.openingBalance,
        currency: input.currency,
        description: input.description,
      },
    });
  },

  async update(userId: string, accountId: string, input: UpdateAccountInput) {
    await getOwnedAccountOrThrow(userId, accountId);
    return prisma.account.update({
      where: { id: accountId },
      data: input,
    });
  },

  async archive(userId: string, accountId: string) {
    await getOwnedAccountOrThrow(userId, accountId);
    return prisma.account.update({
      where: { id: accountId },
      data: { status: "ARCHIVED" },
    });
  },

  async getBalance(userId: string, accountId: string): Promise<string> {
    await getOwnedAccountOrThrow(userId, accountId);
    const balances = await computeBalances(userId, [accountId]);
    return balances.get(accountId) ?? "0.00";
  },

  async listWithBalances(userId: string): Promise<AccountWithBalance[]> {
    const accounts = await prisma.account.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    const balances = await computeBalances(userId);

    return accounts.map((account) => ({
      ...account,
      openingBalance: account.openingBalance.toString(),
      balance: balances.get(account.id) ?? account.openingBalance.toString(),
    }));
  },

  /** Internal helper for other services (e.g. savings-goals) that need a single account's balance without an extra round trip. */
  computeBalancesFor: computeBalances,
};
