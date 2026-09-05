import { Pencil, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { TransactionListItem } from "@/lib/services/transaction-service";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { RecordTransactionDialog } from "@/components/transactions/record-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { formatTransactionDate, formatTransactionType } from "@/components/transactions/transaction-format";
import { TransactionAmount } from "@/components/transactions/transaction-amount";

export function TransactionTable({
  transactions,
  categories,
  accounts,
  highlightId,
  currency,
}: {
  transactions: TransactionListItem[];
  categories: DialogCategory[];
  accounts: DialogAccount[];
  highlightId?: string;
  currency: string;
}) {
  if (transactions.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ArrowLeftRight />
          </EmptyMedia>
          <EmptyTitle>No transactions match these filters</EmptyTitle>
          <EmptyDescription>Record your first transaction, or clear your filters to see existing ones.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <RecordTransactionDialog
            accounts={accounts}
            categories={categories}
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Record a transaction
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "INCOME";
        const accountLabel =
          transaction.type === "TRANSFER"
            ? `${transaction.sourceAccountName ?? "?"} → ${transaction.destinationAccountName ?? "?"}`
            : (transaction.accountName ?? "—");
        const subtitleParts = [
          formatTransactionDate(transaction.transactionDate),
          accountLabel,
          transaction.categoryName ?? formatTransactionType(transaction.type),
        ].filter(Boolean);

        return (
          <li
            key={transaction.id}
            id={`transaction-${transaction.id}`}
            className={cn(
              "-mx-2 rounded-2xl px-2",
              highlightId === transaction.id && "bg-primary/5 ring-1 ring-inset ring-primary/30"
            )}
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
              title={transaction.description || accountLabel}
              subtitle={subtitleParts.join(" · ")}
              trailing={
                <div className="flex items-center gap-1">
                  <TransactionAmount
                    amount={transaction.amount}
                    vatAmount={transaction.vatAmount}
                    type={transaction.type}
                    currency={currency}
                  />
                  <EditTransactionDialog
                    transaction={transaction}
                    categories={categories}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Edit transaction" />}
                    triggerLabel={<Pencil />}
                  />
                  <DeleteTransactionDialog transactionId={transaction.id} label={transaction.description || "transaction"} />
                </div>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
