import { Pencil, Wallet, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/components/transactions/transaction-format";
import { SavingsGoalFormDialog, type EditableSavingsGoal, type DialogAccount } from "./savings-goal-form-dialog";
import { ArchiveGoalDialog } from "./archive-goal-dialog";
import { AllocateDialog } from "./allocate-dialog";
import { MoveAllocationDialog } from "./move-allocation-dialog";

export interface GoalAccountAllocation {
  accountId: string;
  accountName: string;
  amount: string;
  isOverAllocated: boolean;
}

export interface SavingsGoalCardData {
  id: string;
  name: string;
  targetAmount: string;
  targetDate: Date | string | null;
  description: string | null;
  status: string;
  totalAllocated: string;
  progressPercent: number;
  achieved: boolean;
  byAccount: GoalAccountAllocation[];
}

function formatTargetDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(d);
}

export function SavingsGoalCard({
  goal,
  accounts,
  otherActiveGoals,
  currency,
  archived = false,
}: {
  goal: SavingsGoalCardData;
  accounts: DialogAccount[];
  otherActiveGoals: { id: string; name: string }[];
  currency: string;
  archived?: boolean;
}) {
  const editable: EditableSavingsGoal = {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate,
    description: goal.description,
  };
  const overAllocatedAccounts = goal.byAccount.filter((row) => row.isOverAllocated);
  const targetDate = formatTargetDate(goal.targetDate);

  return (
    <Card className={cn(archived && "opacity-70")}>
      <CardHeader>
        <CardTitle>{goal.name}</CardTitle>
        <CardDescription>
          {formatMoney(goal.totalAllocated, currency)} of {formatMoney(goal.targetAmount, currency)}
          {targetDate ? ` · Target ${targetDate}` : ""}
        </CardDescription>
        {!archived && (
          <CardAction>
            <SavingsGoalFormDialog
              goal={editable}
              trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${goal.name}`} />}
              triggerLabel={<Pencil />}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <Progress value={Math.min(goal.progressPercent, 100)} />
        <div className="flex items-center justify-between">
          <Badge variant={goal.achieved ? "default" : "secondary"}>
            {goal.achieved ? "Achieved" : `${goal.progressPercent.toFixed(0)}%`}
          </Badge>
          {archived && (
            <Badge variant="outline" className="capitalize">
              archived
            </Badge>
          )}
        </div>
        {goal.byAccount.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-2">
            {goal.byAccount.map((row) => (
              <div key={row.accountId} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{row.accountName}</span>
                <span className="tabular-nums">{formatMoney(row.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}
        {overAllocatedAccounts.length > 0 && (
          <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {overAllocatedAccounts.map((row) => row.accountName).join(", ")} allocated more than{" "}
              {overAllocatedAccounts.length > 1 ? "their" : "its"} current balance.
            </span>
          </div>
        )}
      </CardContent>
      {!archived && (
        <CardFooter className="flex flex-wrap items-center gap-2">
          <AllocateDialog
            goalId={goal.id}
            goalName={goal.name}
            accounts={accounts}
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={
              <>
                <Wallet /> Allocate
              </>
            }
          />
          {goal.byAccount.length > 0 && otherActiveGoals.length > 0 && (
            <MoveAllocationDialog
              fromGoalId={goal.id}
              fromGoalName={goal.name}
              otherGoals={otherActiveGoals}
              accounts={goal.byAccount.map((row) => ({ id: row.accountId, name: row.accountName, allocated: row.amount }))}
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <ArrowRightLeft /> Move
                </>
              }
            />
          )}
          <ArchiveGoalDialog goalId={goal.id} goalName={goal.name} />
        </CardFooter>
      )}
    </Card>
  );
}
