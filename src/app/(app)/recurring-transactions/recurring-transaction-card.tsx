import { Pencil, Repeat } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/components/transactions/transaction-format";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { formatFrequency } from "./frequency-labels";
import { RecurringTransactionFormDialog, type EditableRecurringTransaction } from "./recurring-transaction-form-dialog";
import { ArchiveRecurringDialog } from "./archive-recurring-dialog";

export interface RecurringTransactionCardData {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export function RecurringTransactionCard({
  template,
  accounts,
  categories,
  currency,
}: {
  template: RecurringTransactionCardData;
  accounts: DialogAccount[];
  categories: DialogCategory[];
  currency: string;
}) {
  const inactive = template.status === "INACTIVE";
  const editable: EditableRecurringTransaction = {
    id: template.id,
    name: template.name,
    type: template.type,
    accountId: template.accountId,
    categoryId: template.categoryId,
    amount: template.amount,
    frequency: template.frequency,
    startDate: template.startDate,
    endDate: template.endDate,
    description: template.description,
  };

  return (
    <Card className={cn(inactive && "opacity-70")}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Repeat className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>
              {template.accountName} · {template.categoryName}
            </CardDescription>
          </div>
        </div>
        {!inactive && (
          <CardAction className="flex gap-1">
            <RecurringTransactionFormDialog
              accounts={accounts}
              categories={categories}
              template={editable}
              trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${template.name}`} />}
              triggerLabel={<Pencil />}
            />
            <ArchiveRecurringDialog templateId={template.id} name={template.name} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              template.type === "INCOME" ? "text-positive" : "text-negative"
            )}
          >
            {formatMoney(template.amount, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Frequency</span>
          <span>{formatFrequency(template.frequency)}</span>
        </div>
        <Badge variant={inactive ? "outline" : "default"} className="w-fit capitalize">
          {template.status.toLowerCase()}
        </Badge>
      </CardContent>
    </Card>
  );
}
