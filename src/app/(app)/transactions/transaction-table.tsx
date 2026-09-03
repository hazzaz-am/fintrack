import { Pencil, ArrowLeftRight, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { TransactionListItem } from "@/lib/services/transaction-service";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { RecordTransactionDialog } from "@/components/transactions/record-transaction-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { formatMoney, formatTransactionDate, formatTransactionType } from "@/components/transactions/transaction-format";

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-0">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          const amount = Number(transaction.amount);
          const isIncome = transaction.type === "INCOME";
          const isExpense = transaction.type === "EXPENSE";
          const accountLabel =
            transaction.type === "TRANSFER"
              ? `${transaction.sourceAccountName ?? "?"} → ${transaction.destinationAccountName ?? "?"}`
              : (transaction.accountName ?? "—");

          return (
            <TableRow
              key={transaction.id}
              id={`transaction-${transaction.id}`}
              className={cn(highlightId === transaction.id && "bg-primary/5 ring-1 ring-inset ring-primary/30")}
            >
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatTransactionDate(transaction.transactionDate)}
              </TableCell>
              <TableCell>{accountLabel}</TableCell>
              <TableCell className="max-w-48 truncate">{transaction.description || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{transaction.categoryName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{formatTransactionType(transaction.type)}</Badge>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  isIncome && "text-positive",
                  isExpense && "text-negative"
                )}
              >
                {isIncome ? "+" : isExpense ? "−" : ""}
                {formatMoney(Math.abs(amount).toFixed(2), currency)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditTransactionDialog
                    transaction={transaction}
                    categories={categories}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Edit transaction" />}
                    triggerLabel={<Pencil />}
                  />
                  <DeleteTransactionDialog transactionId={transaction.id} label={transaction.description || "transaction"} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
