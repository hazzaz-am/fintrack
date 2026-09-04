import { Plus } from "lucide-react";
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

export const metadata = { title: "Income — FinTrack" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function IncomePage({
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
    AnalyticsService.getCategoryBreakdown(userId, "INCOME", range),
    AnalyticsService.getMonthlyTrend(userId, trailingMonthsRange(6)),
    TransactionService.listPaginated(userId, { type: "INCOME", pageSize: 8, sortBy: "transactionDate", sortDir: "desc" }),
    AccountService.listWithBalances(userId),
    CategoryService.list(userId),
  ]);

  const currency = accounts[0]?.currency ?? "BDT";
  const hasIncome = Number(summary.income) > 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground">Where your money comes from.</p>
        </div>
        {accounts.length > 0 && (
          <RecordTransactionDialog
            accounts={accounts}
            categories={categories}
            defaultType="INCOME"
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Record income
              </>
            }
          />
        )}
      </div>

      <PeriodSelectForm period={period} from={fromParam} to={toParam} />

      <Card>
        <CardHeader>
          <CardTitle>Total income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums text-positive">{formatMoney(summary.income, currency)}</div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By source</CardTitle>
          </CardHeader>
          <CardContent>
            {hasIncome ? (
              <CategoryBreakdownChart data={breakdown} currency={currency} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No income recorded for this period yet.</p>
            )}
          </CardContent>
        </Card>
        <Card highlight>
          <CardHeader>
            <CardTitle>Last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} variant="hero" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent income</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactionsList
            transactions={recent.items}
            currency={currency}
            emptyMessage="Record your first income transaction to see it here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
