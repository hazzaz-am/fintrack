import { AlertTriangle, Clock, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/components/transactions/transaction-format";
import { ReturnPromiseDialog } from "./return-promise-dialog";
import { WriteOffPromiseDialog } from "./write-off-promise-dialog";

export interface ReservationBannerItem {
  id: string;
  goalName: string;
  remainingAmount: string;
  dueDate: Date;
  isOverdue: boolean;
}

function formatDueDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Dashboard-ui spec, "Dashboard shows a reserved-funds return banner": one
// line per open/overdue GoalReservationPromise, omitted entirely when there
// are none — never a placeholder card (design.md D10). Overdue lines get the
// destructive tone the rest of this app already uses for a hard warning
// (see the over-allocation banner on Savings Goal cards); not-yet-due ones
// use the softer warning tone, since nothing has actually gone wrong yet.
export function ReservationBanner({ items, currency }: { items: ReservationBannerItem[]; currency: string }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex flex-col items-start gap-2 rounded-md p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
            item.isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"
          )}
        >
          <div className="flex items-start gap-2">
            {item.isOverdue ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Clock className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {formatMoney(item.remainingAmount, currency)} owed back to <strong>{item.goalName}</strong>
              {item.isOverdue ? " — was due " : " by "}
              {formatDueDate(item.dueDate)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ReturnPromiseDialog
              promiseId={item.id}
              goalName={item.goalName}
              remainingAmount={item.remainingAmount}
              currency={currency}
              trigger={<Button variant="ghost" size="sm" />}
              triggerLabel={
                <>
                  <Undo2 /> Return
                </>
              }
            />
            <WriteOffPromiseDialog
              promiseId={item.id}
              goalName={item.goalName}
              remainingAmount={item.remainingAmount}
              currency={currency}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
