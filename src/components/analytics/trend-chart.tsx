"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartHatchPattern,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { MonthlyTrendItem } from "@/lib/services/analytics-service";

const config: ChartConfig = {
  income: { label: "Income", color: "var(--chart-1)" },
  expense: { label: "Expense", color: "var(--chart-2)" },
};

// Shared by Income and Expenses (both series are always shown; each screen's
// surrounding context makes clear which one it's emphasizing) so the trend
// visualization is defined once, matching AnalyticsService.getMonthlyTrend's
// shape directly.
//
// `variant="hero"` is for placement on a --highlight (mustard) card: bars get
// a diagonal hatch-pattern fill instead of a solid color, per the
// design-system spec's "bar charts on a hero surface" requirement.
export function TrendChart({
  data,
  variant = "default",
}: {
  data: MonthlyTrendItem[];
  variant?: "default" | "hero";
}) {
  const chartData = data.map((item) => ({
    month: item.month,
    income: Number(item.income),
    expense: Number(item.expense),
  }));

  const patternId = useId().replace(/:/g, "");
  const incomePattern = `trend-hatch-income-${patternId}`;
  const expensePattern = `trend-hatch-expense-${patternId}`;
  const isHero = variant === "hero";

  return (
    <ChartContainer config={config} className="max-h-64 w-full">
      <BarChart data={chartData}>
        {isHero ? (
          <>
            <ChartHatchPattern id={incomePattern} color="var(--highlight-foreground)" />
            <ChartHatchPattern id={expensePattern} color="var(--highlight-foreground)" size={5} />
          </>
        ) : null}
        <CartesianGrid vertical={false} stroke={isHero ? "var(--highlight-foreground)" : undefined} strokeOpacity={isHero ? 0.15 : undefined} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          stroke={isHero ? "var(--highlight-foreground)" : undefined}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          stroke={isHero ? "var(--highlight-foreground)" : undefined}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="income"
          fill={isHero ? `url(#${incomePattern})` : "var(--color-income)"}
          radius={4}
        />
        <Bar
          dataKey="expense"
          fill={isHero ? `url(#${expensePattern})` : "var(--color-expense)"}
          radius={4}
        />
      </BarChart>
    </ChartContainer>
  );
}
