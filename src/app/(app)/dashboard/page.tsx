import { Plus, Wallet, LineChart } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { TransactionService } from "@/lib/services/transaction-service";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { AccountService } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { resolveDateRange, trailingMonthsRange } from "@/lib/date-range";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { RecordTransactionDialog } from "@/components/transactions/record-transaction-dialog";
import { RecentTransactionsList } from "@/components/transactions/recent-transactions-list";
import { CategoryBreakdownChart } from "@/components/analytics/category-breakdown-chart";
import { TrendChart } from "@/components/analytics/trend-chart";
import { DueRecurringWidget } from "@/app/(app)/recurring-transactions/due-recurring-widget";
import { formatMoney } from "@/components/transactions/transaction-format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — FinTrack" };

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-xl font-semibold tabular-nums",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative"
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const userId = await requireAuth();
  const range = resolveDateRange("month");

  const [accounts, summary, investmentTotals, upcomingMaturities, expenseBreakdown, recent, categories, dueRecurring, trend] =
    await Promise.all([
      AccountService.listWithBalances(userId),
      TransactionService.getSummary(userId, range),
      InvestmentService.getTotals(userId),
      InvestmentService.getUpcomingMaturities(userId),
      AnalyticsService.getCategoryBreakdown(userId, "EXPENSE", range),
      TransactionService.listPaginated(userId, { pageSize: 8, sortBy: "transactionDate", sortDir: "desc" }),
      CategoryService.list(userId),
      RecurringTransactionService.getDueTemplates(userId),
      AnalyticsService.getMonthlyTrend(userId, trailingMonthsRange(6)),
    ]);

  const currency = accounts[0]?.currency ?? "BDT";
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const income = Number(summary.income);
  const expense = Number(summary.expense);
  // Zero-safe: no income this period means savings rate is shown as 0%, never NaN/Infinity.
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const dueRecurringItems = dueRecurring.map((template) => ({
    id: template.id,
    name: template.name,
    amount: template.amount.toString(),
    slotStart: template.slotStart,
    description: template.description,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your complete financial picture, this month.</p>
        </div>
        {accounts.length > 0 && (
          <div className="shrink-0">
            <RecordTransactionDialog
              accounts={accounts}
              categories={categories}
              trigger={<Button />}
              triggerLabel={
                <>
                  <Plus /> Record transaction
                </>
              }
            />
          </div>
        )}
      </div>

      <Card highlight>
        <CardHeader>
          <CardDescription className="text-highlight-foreground/70">Total balance</CardDescription>
          <div className="text-3xl font-semibold tabular-nums">{formatMoney(totalBalance.toFixed(2), currency)}</div>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} variant="hero" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Income this month" value={formatMoney(summary.income, currency)} tone="positive" />
        <MetricCard label="Expenses this month" value={formatMoney(summary.expense, currency)} tone="negative" />
        <MetricCard
          label="Net cash flow"
          value={formatMoney(summary.netCashFlow, currency)}
          tone={income - expense >= 0 ? "positive" : "negative"}
        />
        <MetricCard label="Savings rate" value={`${savingsRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total invested" value={formatMoney(investmentTotals.totalInvested, currency)} />
        <MetricCard label="Expected profit" value={formatMoney(investmentTotals.expectedProfit, currency)} />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded this month yet.</p>
            ) : (
              <CategoryBreakdownChart data={expenseBreakdown} currency={currency} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Due recurring transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DueRecurringWidget items={dueRecurringItems} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming investment maturities</CardTitle>
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
                    subtitle={
                      <span className={cn(investment.daysUntilMaturity < 0 && "text-negative")}>
                        {investment.daysUntilMaturity < 0
                          ? `Overdue by ${Math.abs(investment.daysUntilMaturity)} days`
                          : `Matures in ${investment.daysUntilMaturity} days`}
                      </span>
                    }
                    trailing={
                      investment.expectedReturnAmount
                        ? formatMoney(investment.expectedReturnAmount.toString(), currency)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactionsList
            transactions={recent.items}
            currency={currency}
            emptyMessage="Record your first transaction to see it here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
