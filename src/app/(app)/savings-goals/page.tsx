import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { AccountService } from "@/lib/services/account-service";
import { Button } from "@/components/ui/button";
import { SavingsGoalFormDialog } from "./savings-goal-form-dialog";
import { SavingsGoalList } from "./savings-goal-list";
import type { SavingsGoalCardData } from "./savings-goal-card";

export const metadata = { title: "Savings Goals — FinTrack" };

export default async function SavingsGoalsPage() {
  const userId = await requireAuth();
  const [goals, accounts] = await Promise.all([
    SavingsGoalService.list(userId),
    AccountService.listWithBalances(userId),
  ]);

  const progresses = await Promise.all(goals.map((goal) => SavingsGoalService.getProgress(userId, goal.id)));

  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

  // Dedupe accounts referenced across every goal's allocation breakdown before
  // checking over-allocation status, so an account funding several goals only
  // costs one lookup (design.md D6).
  const referencedAccountIds = Array.from(
    new Set(progresses.flatMap((progress) => progress.byAccount.map((row) => row.accountId)))
  );
  const allocationStatuses = await Promise.all(
    referencedAccountIds.map((accountId) => SavingsGoalService.getAccountAllocationStatus(userId, accountId))
  );
  const overAllocatedByAccountId = new Map(
    referencedAccountIds.map((accountId, index) => [accountId, allocationStatuses[index].isOverAllocated])
  );

  // Decimal fields need normalizing to strings before crossing into Client
  // Components (same rationale as InvestmentsPage) — Decimal instances aren't
  // a serializable prop. targetDate stays a Date, same as Investments' dates.
  const cards: SavingsGoalCardData[] = goals.map((goal, index) => {
    const progress = progresses[index];
    const totalAllocated = progress.totalAllocated;
    const targetAmount = goal.targetAmount.toString();
    return {
      id: goal.id,
      name: goal.name,
      targetAmount,
      targetDate: goal.targetDate,
      description: goal.description,
      status: goal.status,
      totalAllocated,
      progressPercent: progress.progressPercent,
      achieved: Number(totalAllocated) >= Number(targetAmount),
      byAccount: progress.byAccount.map((row) => ({
        accountId: row.accountId,
        accountName: accountNameById.get(row.accountId) ?? "Unknown account",
        amount: row.amount,
        isOverAllocated: overAllocatedByAccountId.get(row.accountId) ?? false,
      })),
    };
  });

  const dialogAccounts = accounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency }));
  const currency = accounts[0]?.currency ?? "BDT";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set aside money within your accounts for marriage, travel, emergencies, or anything else you&apos;re saving for.
          </p>
        </div>
        {cards.length > 0 && (
          <SavingsGoalFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> New goal
              </>
            }
          />
        )}
      </div>
      <SavingsGoalList goals={cards} accounts={dialogAccounts} currency={currency} />
    </div>
  );
}
