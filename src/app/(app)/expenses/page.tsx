import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { TransactionService } from "@/lib/services/transaction-service";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { AccountService } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import { resolveDateRange, trailingMonthsRange, isDateRangePeriod, type DateRangePeriod } from "@/lib/date-range";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RecordTransactionDialog } from "@/components/transactions/record-transaction-dialog";
import { RecentTransactionsList } from "@/components/transactions/recent-transactions-list";
import { CategoryBreakdownChart } from "@/components/analytics/category-breakdown-chart";
import { TrendChart } from "@/components/analytics/trend-chart";
import { PeriodSelectForm } from "@/components/analytics/period-select-form";
import { formatMoney } from "@/components/transactions/transaction-format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Expenses — FinTrack" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await requireAuth();
  const params = await searchParams;

  const periodParam = first(params.period);
  const period: DateRangePeriod = isDateRangePeriod(periodParam) ? periodParam : "month";
  const fromParam = first(params.from);
  const toParam = first(params.to);
  const range = resolveDateRange(
    period,
    period === "custom" ? { from: fromParam ? new Date(fromParam) : undefined, to: toParam ? new Date(toParam) : undefined } : undefined
  );

  const [summary, breakdown, trend, recent, accounts, categories] = await Promise.all([
    TransactionService.getSummary(userId, range),
    AnalyticsService.getCategoryBreakdown(userId, "EXPENSE", range),
    AnalyticsService.getMonthlyTrend(userId, trailingMonthsRange(6)),
    TransactionService.listPaginated(userId, { type: "EXPENSE", pageSize: 8, sortBy: "transactionDate", sortDir: "desc" }),
    AccountService.listWithBalances(userId),
    CategoryService.list(userId),
  ]);

  const currency = accounts[0]?.currency ?? "BDT";
  const hasExpenses = Number(summary.expense) > 0;

  // Month-over-month comparison, derived from the same trailing-trend
  // aggregation used for the trend chart (design.md, tasks.md 5.3) — not a
  // separate query.
  const currentMonth = trend.at(-1);
  const previousMonth = trend.at(-2);
  const currentAmount = currentMonth ? Number(currentMonth.expense) : 0;
  const previousAmount = previousMonth ? Number(previousMonth.expense) : 0;
  const hasComparison = previousMonth !== undefined && previousAmount > 0;
  const percentChange = hasComparison ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Where your money is going.</p>
        </div>
        {accounts.length > 0 && (
          <RecordTransactionDialog
            accounts={accounts}
            categories={categories}
            defaultType="EXPENSE"
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Record expense
              </>
            }
          />
        )}
      </div>

      <PeriodSelectForm period={period} from={fromParam} to={toParam} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-negative">{formatMoney(summary.expense, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vs. last month</CardTitle>
          </CardHeader>
          <CardContent>
            {hasComparison ? (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-lg font-semibold tabular-nums",
                  percentChange > 0 && "text-negative",
                  percentChange < 0 && "text-positive"
                )}
              >
                {percentChange > 0 ? <TrendingUp className="size-5" /> : percentChange < 0 ? <TrendingDown className="size-5" /> : <Minus className="size-5" />}
                {Math.abs(percentChange).toFixed(1)}%
                <span className="text-sm font-normal text-muted-foreground">{percentChange > 0 ? "more" : "less"}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough history yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            {hasExpenses ? (
              <CategoryBreakdownChart data={breakdown} currency={currency} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded for this period yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactionsList
            transactions={recent.items}
            currency={currency}
            emptyMessage="Record your first expense to see it here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
