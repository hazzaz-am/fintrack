import Link from "next/link";
import { Inbox, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ListRow } from "@/components/ui/list-row";
import { cn } from "@/lib/utils";
import type { TransactionListItem } from "@/lib/services/transaction-service";
import { formatMoney, formatTransactionDate, formatTransactionType } from "./transaction-format";

// Read-only everywhere it's used (Income, Expenses, Dashboard) — editing and
// deleting a transaction stays exclusively on the Transactions screen
// (design.md D17). Each row links there instead of offering inline actions.
export function RecentTransactionsList({
  transactions,
  emptyMessage = "No transactions yet.",
  currency = "BDT",
}: {
  transactions: TransactionListItem[];
  emptyMessage?: string;
  currency?: string;
}) {
  if (transactions.length === 0) {
    return (
      <Empty className="border py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {transactions.map((transaction) => {
        const amount = Number(transaction.amount);
        const isExpense = transaction.type === "EXPENSE";
        const isIncome = transaction.type === "INCOME";
        const label =
          transaction.type === "TRANSFER"
            ? `${transaction.sourceAccountName ?? "?"} → ${transaction.destinationAccountName ?? "?"}`
            : (transaction.categoryName ?? formatTransactionType(transaction.type));

        return (
          <li key={transaction.id}>
            <Link
              href={`/transactions?highlight=${transaction.id}`}
              className="-mx-2 block rounded-2xl px-2 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <ListRow
                icon={
                  transaction.type === "TRANSFER" ? (
                    <ArrowLeftRight />
                  ) : isIncome ? (
                    <ArrowDownLeft />
                  ) : (
                    <ArrowUpRight />
                  )
                }
                title={transaction.description || label}
                subtitle={
                  formatTransactionDate(transaction.transactionDate) +
                  (transaction.accountName ? ` · ${transaction.accountName}` : "")
                }
                trailing={
                  <span
                    className={cn(
                      "tabular-nums",
                      isIncome && "text-positive",
                      isExpense && "text-negative"
                    )}
                  >
                    {isIncome ? "+" : isExpense ? "−" : ""}
                    {formatMoney(Math.abs(amount).toFixed(2), currency)}
                  </span>
                }
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
