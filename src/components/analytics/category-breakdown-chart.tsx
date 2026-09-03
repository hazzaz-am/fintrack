"use client";

import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { CategoryBreakdownItem } from "@/lib/services/analytics-service";
import { formatMoney } from "@/components/transactions/transaction-format";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function CategoryBreakdownChart({
  data,
  currency = "BDT",
  emptyMessage = "No transactions in this period yet.",
}: {
  data: CategoryBreakdownItem[];
  currency?: string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const chartData = data.map((item, index) => ({
    ...item,
    amount: Number(item.amount),
    fill: COLORS[index % COLORS.length],
  }));
  const config: ChartConfig = Object.fromEntries(
    chartData.map((item) => [item.categoryId, { label: item.categoryName, color: item.fill }])
  );
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ChartContainer config={config} className="mx-auto aspect-square max-h-56 w-full max-w-56 shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="categoryName" hideLabel />} />
          <Pie data={chartData} dataKey="amount" nameKey="categoryName" innerRadius={55} outerRadius={90} strokeWidth={2}>
            {chartData.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-1 flex-col gap-1.5 text-sm">
        {chartData.map((item) => (
          <li key={item.categoryId} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.fill }} />
              <span className="truncate">{item.categoryName}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatMoney(item.amount.toFixed(2), currency)} · {total > 0 ? Math.round((item.amount / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
