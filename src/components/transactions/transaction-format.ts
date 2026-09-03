export { formatMoney } from "@/app/(app)/accounts/account-type-labels";

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
  INVESTMENT_CONTRIBUTION: "Investment contribution",
  INVESTMENT_RETURN: "Investment return",
};

export function formatTransactionType(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function formatTransactionDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}
