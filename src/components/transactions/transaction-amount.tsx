import { cn } from "@/lib/utils";
import { formatMoney } from "./transaction-format";

// Shared by the Transactions list and the recent-transactions list (Income,
// Expenses, Dashboard) so VAT rendering — and the account-balance-matching
// total it produces — stays identical everywhere a transaction amount shows.
export function TransactionAmount({
  amount,
  vatAmount,
  type,
  currency,
}: {
  amount: string;
  vatAmount: string | null;
  type: string;
  currency: string;
}) {
  const isIncome = type === "INCOME";
  const isExpense = type === "EXPENSE";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const colorClass = cn("tabular-nums", isIncome && "text-positive", isExpense && "text-negative");

  if (!vatAmount) {
    return (
      <span className={colorClass}>
        {sign}
        {formatMoney(Math.abs(Number(amount)).toFixed(2), currency)}
      </span>
    );
  }

  const total = Number(amount) + Number(vatAmount);

  return (
    <div className="flex flex-col items-end text-xs text-muted-foreground">
      <span className="tabular-nums">
        {sign}
        {formatMoney(Math.abs(Number(amount)).toFixed(2), currency)}
      </span>
      <span className="tabular-nums">
        +{formatMoney(Math.abs(Number(vatAmount)).toFixed(2), currency)} VAT
      </span>
      <span className={cn("mt-0.5 border-t border-border pt-0.5 text-sm font-medium", colorClass)}>
        {sign}
        {formatMoney(Math.abs(total).toFixed(2), currency)}
      </span>
    </div>
  );
}
