import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validation/account";

const { Decimal } = Prisma;

export interface ChronologicalPosition {
  transactionDate: Date;
  createdAt: Date;
  id: string;
}

interface ChronologicalRow extends ChronologicalPosition {
  type: string;
  amount: Prisma.Decimal;
  vatAmount: Prisma.Decimal | null;
  accountId: string | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
}

// Same tiebreak as the query's ORDER BY: transactionDate, then createdAt,
// then id. Two transactions can share a transactionDate (most users record
// several things on one day), so comparing dates alone can't tell which of
// two same-day rows counts as "before" the other — only this full position
// can.
function isBefore(a: ChronologicalPosition, b: ChronologicalPosition): boolean {
  if (a.transactionDate.getTime() !== b.transactionDate.getTime()) {
    return a.transactionDate.getTime() < b.transactionDate.getTime();
  }
  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt.getTime() < b.createdAt.getTime();
  }
  return a.id < b.id;
}

// Signed effect of one transaction row on a specific account's balance,
// matching the sign conventions in computeBalances above. Transfers apply to
// both accounts at once but with opposite roles (source pays VAT, dest
// doesn't) — the caller always asks about one account, so only that
// account's side of a transfer contributes.
function effectOn(accountId: string, row: ChronologicalRow): Prisma.Decimal {
  switch (row.type) {
    case "INCOME":
      return row.accountId === accountId ? row.amount : new Decimal(0);
    case "EXPENSE":
      return row.accountId === accountId ? row.amount.plus(row.vatAmount ?? 0).negated() : new Decimal(0);
    case "TRANSFER":
      if (row.destinationAccountId === accountId) return row.amount;
      if (row.sourceAccountId === accountId) return row.amount.plus(row.vatAmount ?? 0).negated();
      return new Decimal(0);
    case "INVESTMENT_CONTRIBUTION":
      return row.accountId === accountId ? row.amount.negated() : new Decimal(0);
    case "INVESTMENT_RETURN":
      return row.accountId === accountId ? row.amount : new Decimal(0);
    case "LOAN_DISBURSEMENT":
      return row.accountId === accountId ? row.amount.negated() : new Decimal(0);
    case "LOAN_REPAYMENT":
      return row.accountId === accountId ? row.amount : new Decimal(0);
    default:
      return new Decimal(0);
  }
}

// Replays openingBalance forward through every transaction affecting this
// account, ordered chronologically (transactionDate, then createdAt, then id
// as a deterministic same-day tiebreak). Rejects if the running balance would
// go negative at any point AT OR AFTER `anchor`'s position — not merely at
// the end (design.md D1: a final-total check alone can be fooled by a
// backdated insert or a future-dated inflow). Anything strictly before
// `anchor` is only summed, never re-validated: this write did not create
// that portion of history, and this app deliberately does not audit/backfill
// pre-existing data (design.md D6), so an old, unrelated dip must not
// permanently block every future write on the account — only a violation
// this write's own position could actually cause is rejected.
//
// `anchor` must be a full position, not just a date — two transactions often
// share a transactionDate (most users record several things on one day), and
// comparing dates alone would fail to exclude an earlier same-day row from
// re-validation (see `isBefore`). It's the earliest position this write
// could affect: the new row's own position for a create, the deleted row's
// pre-delete position for a delete, or the earlier of the old/new position
// for an edit that moves a transaction's date.
//
// Must be called after the write it's guarding, inside the same `tx` —
// throwing here rolls back that whole transaction, so create/update/delete
// all reuse this one check uniformly against whatever the DB now actually
// contains.
export async function assertChronologicalBalanceNonNegative(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
  anchor: ChronologicalPosition
): Promise<void> {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId) {
    throw new AppError("NOT_FOUND", "Account not found.");
  }

  const rows = await tx.transaction.findMany({
    where: {
      userId,
      OR: [{ accountId }, { sourceAccountId: accountId }, { destinationAccountId: accountId }],
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      vatAmount: true,
      transactionDate: true,
      createdAt: true,
      accountId: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  let running = new Decimal(account.openingBalance);
  for (const row of rows) {
    running = running.plus(effectOn(accountId, row));
    if (isBefore(row, anchor)) continue;
    if (running.isNegative()) {
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        `This account's balance would go negative on ${row.transactionDate.toISOString().slice(0, 10)}.`,
        { accountId, violatingDate: row.transactionDate.toISOString(), runningBalance: running.toFixed(2) }
      );
    }
  }
}

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
//           - investment contributions + investment returns
//           - loan disbursements + loan repayments
//           - VAT on expenses - VAT on transfers out (source account only)
// (design.md D1, D6; add-borrower-tracking design.md D8). No N+1 query per
// account. Investment/loan transaction types are excluded from income/expense
// the same way transfers are — see TransactionService/InvestmentService/
// BorrowerService. VAT is a fixed amount deducted from the paying/source
// account in addition to `amount`, but is never part of `amount` itself, so
// it doesn't affect category totals or getSummary.
async function computeBalances(userId: string, accountIds?: string[]): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<Array<{ accountId: string; balance: string }>>`
    SELECT
      a.id AS "accountId",
      (
        a."openingBalance"
        + COALESCE(SUM(CASE WHEN t."type" = 'INCOME' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'EXPENSE' AND t."accountId" = a.id THEN t."vatAmount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        + COALESCE(SUM(CASE WHEN t."type" = 'TRANSFER' AND t."destinationAccountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'TRANSFER' AND t."sourceAccountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'TRANSFER' AND t."sourceAccountId" = a.id THEN t."vatAmount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'INVESTMENT_CONTRIBUTION' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        + COALESCE(SUM(CASE WHEN t."type" = 'INVESTMENT_RETURN' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        - COALESCE(SUM(CASE WHEN t."type" = 'LOAN_DISBURSEMENT' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
        + COALESCE(SUM(CASE WHEN t."type" = 'LOAN_REPAYMENT' AND t."accountId" = a.id THEN t."amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))
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
