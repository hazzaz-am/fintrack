import { requireAuth } from "@/lib/auth/require-auth";
import { TransactionService } from "@/lib/services/transaction-service";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { AccountService } from "@/lib/services/account-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { resolveDateRange, isDateRangePeriod, type DateRangePeriod } from "@/lib/date-range";
import { Wallet, LineChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListRow } from "@/components/ui/list-row";
import { PeriodSelectForm } from "@/components/analytics/period-select-form";
import { formatMoney } from "@/components/transactions/transaction-format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports — FinTrack" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
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

  const [summary, expenseBreakdown, accounts, investmentTotals, upcomingMaturities, investments] = await Promise.all([
    TransactionService.getSummary(userId, range),
    AnalyticsService.getCategoryBreakdown(userId, "EXPENSE", range),
    AccountService.listWithBalances(userId),
    InvestmentService.getTotals(userId),
    InvestmentService.getUpcomingMaturities(userId),
    InvestmentService.listWithPrincipal(userId),
  ]);

  const currency = accounts[0]?.currency ?? "BDT";
  const income = Number(summary.income);
  const expense = Number(summary.expense);
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  // Derived from the same breakdown query, not a separate one (design.md D18).
  const topExpenseCategory = expenseBreakdown[0];

  const matured = investments.filter((investment) => investment.status === "MATURED").length;
  const active = investments.filter((investment) => investment.status === "ACTIVE").length;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Monthly summaries, balances, and investment performance in one place.</p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Monthly summary</TabsTrigger>
          <TabsTrigger value="accounts">Account balances</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 flex flex-col gap-4">
          <PeriodSelectForm period={period} from={fromParam} to={toParam} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total income</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums text-positive">{formatMoney(summary.income, currency)}</div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums text-negative">{formatMoney(summary.expense, currency)}</div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Net savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    income - expense >= 0 ? "text-positive" : "text-negative"
                  )}
                >
                  {formatMoney(summary.netCashFlow, currency)}
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Savings rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums">{savingsRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Top expense category</CardTitle>
            </CardHeader>
            <CardContent>
              {topExpenseCategory ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{topExpenseCategory.categoryName}</span>
                  <span className="tabular-nums text-muted-foreground">{formatMoney(topExpenseCategory.amount, currency)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No expenses recorded for this period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account balances</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {accounts.map((account) => {
                    const balance = Number(account.balance);
                    return (
                      <li key={account.id}>
                        <ListRow
                          icon={<Wallet />}
                          title={account.name}
                          trailing={
                            <span
                              className={cn(
                                "tabular-nums",
                                balance > 0 && "text-positive",
                                balance < 0 && "text-negative"
                              )}
                            >
                              {formatMoney(account.balance, account.currency)}
                            </span>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total invested</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums">{formatMoney(investmentTotals.totalInvested, currency)}</div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Expected profit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums">{formatMoney(investmentTotals.expectedProfit, currency)}</div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Active investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums">{active}</div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Matured investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold tabular-nums">{matured}</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming maturities</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMaturities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming maturities.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {upcomingMaturities.map((investment) => (
                    <li key={investment.id}>
                      <ListRow
                        icon={<LineChart />}
                        title={investment.name}
                        trailing={
                          <span
                            className={cn(
                              "tabular-nums",
                              investment.daysUntilMaturity < 0 ? "text-negative" : "text-muted-foreground"
                            )}
                          >
                            {investment.daysUntilMaturity < 0
                              ? `Overdue by ${Math.abs(investment.daysUntilMaturity)} days`
                              : `Matures in ${investment.daysUntilMaturity} days`}
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
