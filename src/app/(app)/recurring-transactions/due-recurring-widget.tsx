import { CheckCircle2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { formatMoney } from "@/components/transactions/transaction-format";
import { ConfirmRecurringDialog } from "./confirm-recurring-dialog";

export interface DueRecurringItem {
  id: string;
  name: string;
  amount: string;
  slotStart: Date;
  description: string | null;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Mirrors the Dashboard's "Upcoming investment maturities" widget: a due
// template is never confirmed automatically (recurring-transactions spec) —
// this is the one-click surfacing point that opens the explicit confirm step.
export function DueRecurringWidget({ items, currency }: { items: DueRecurringItem[]; currency: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recurring transactions due.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <ListRow
            icon={<Repeat />}
            title={item.name}
            subtitle={formatMoney(item.amount, currency)}
            trailing={
              <ConfirmRecurringDialog
                templateId={item.id}
                templateName={item.name}
                defaultAmount={item.amount}
                defaultDate={toDateInputValue(item.slotStart)}
                defaultDescription={item.description ?? ""}
                trigger={<Button variant="outline" size="sm" />}
                triggerLabel={
                  <>
                    <CheckCircle2 /> Confirm
                  </>
                }
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
