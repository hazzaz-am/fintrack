import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { monthsInRange, type ResolvedDateRange } from "@/lib/date-range";

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: string;
}

export interface MonthlyTrendItem {
  /** "yyyy-MM" */
  month: string;
  income: string;
  expense: string;
}

// AnalyticsService is the single shared aggregation layer Income, Expenses,
// Dashboard, and Reports all consume (design.md D15) — the PRD independently
// describes "category breakdown" in four places; this exists so it's
// computed once, not reinvented per screen. TransactionService.getSummary
// (flat totals) is unrelated and unchanged.
export const AnalyticsService = {
  // Raw SQL, not Prisma `groupBy`: EXPENSE totals need `amount + vatAmount`
  // per row before grouping (vatAmount rides with whichever category its
  // transaction belongs to — there's no separate VAT category), which
  // `groupBy`'s `_sum` can't express across two columns (design.md D1).
  async getCategoryBreakdown(
    userId: string,
    type: "INCOME" | "EXPENSE",
    range: ResolvedDateRange
  ): Promise<CategoryBreakdownItem[]> {
    const grouped = await prisma.$queryRaw<Array<{ categoryId: string; amount: string }>>`
      SELECT
        "categoryId",
        COALESCE(SUM("amount" + COALESCE("vatAmount", 0::numeric(14,2))), 0::numeric(14,2))::text AS "amount"
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND "type" = ${type}::"TransactionType"
        AND "categoryId" IS NOT NULL
        AND "transactionDate" >= ${range.from}
        AND "transactionDate" <= ${range.to}
      GROUP BY "categoryId"
    `;

    if (grouped.length === 0) return [];

    const categories = await prisma.category.findMany({
      where: { id: { in: grouped.map((row) => row.categoryId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(categories.map((category) => [category.id, category.name]));

    return grouped
      .map((row) => ({
        categoryId: row.categoryId,
        categoryName: nameById.get(row.categoryId) ?? "Uncategorized",
        amount: row.amount,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  },

  // Raw SQL (like getSummary): bucketing by truncated month is the same
  // "one conditional-sum query" shape, just grouped instead of a single row.
  // Zero-activity months are filled in afterward so callers always get one
  // point per month in range, not a gap.
  async getMonthlyTrend(userId: string, range: ResolvedDateRange): Promise<MonthlyTrendItem[]> {
    const rows = await prisma.$queryRaw<Array<{ month: string; income: string; expense: string }>>`
      SELECT
        to_char(date_trunc('month', "transactionDate"), 'YYYY-MM') AS "month",
        COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "income",
        COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" + COALESCE("vatAmount", 0::numeric(14,2)) ELSE 0::numeric(14,2) END), 0::numeric(14,2))::text AS "expense"
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND "transactionDate" >= ${range.from}
        AND "transactionDate" <= ${range.to}
      GROUP BY date_trunc('month', "transactionDate")
    `;
    const byMonth = new Map(rows.map((row) => [row.month, row]));

    return monthsInRange(range).map((monthStart) => {
      const key = format(monthStart, "yyyy-MM");
      const row = byMonth.get(key);
      return { month: key, income: row?.income ?? "0.00", expense: row?.expense ?? "0.00" };
    });
  },
};
