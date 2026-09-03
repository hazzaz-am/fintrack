"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
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
export function TrendChart({ data }: { data: MonthlyTrendItem[] }) {
  const chartData = data.map((item) => ({
    month: item.month,
    income: Number(item.income),
    expense: Number(item.expense),
  }));

  return (
    <ChartContainer config={config} className="max-h-64 w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
