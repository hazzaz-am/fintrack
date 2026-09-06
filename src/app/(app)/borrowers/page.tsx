import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { BorrowerService } from "@/lib/services/borrower-service";
import { AccountService } from "@/lib/services/account-service";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { Button } from "@/components/ui/button";
import { BorrowerFormDialog } from "./borrower-form-dialog";
import { BorrowerList } from "./borrower-list";
import type { BorrowerCardData } from "./borrower-card";

export const metadata = { title: "Borrowers — FinTrack" };

export default async function BorrowersPage() {
  const userId = await requireAuth();
  const [borrowers, accounts, allLoans] = await Promise.all([
    BorrowerService.listWithOutstanding(userId),
    AccountService.listWithBalances(userId),
    BorrowerService.listAllLoans(userId),
  ]);

  const allocationStatuses = await Promise.all(
    accounts.map((account) => SavingsGoalService.getAccountAllocationStatus(userId, account.id))
  );
  const unallocatedByAccountId = new Map(accounts.map((account, i) => [account.id, allocationStatuses[i].unallocated]));

  const loansByBorrower = new Map<string, typeof allLoans>();
  for (const loan of allLoans) {
    const list = loansByBorrower.get(loan.borrowerId) ?? [];
    list.push(loan);
    loansByBorrower.set(loan.borrowerId, list);
  }

  const currency = accounts[0]?.currency ?? "BDT";
  const lendAccounts = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    unallocated: unallocatedByAccountId.get(account.id) ?? "0.00",
  }));
  const repayAccounts = accounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency }));

  const cards: BorrowerCardData[] = borrowers.map((borrower) => ({
    id: borrower.id,
    name: borrower.name,
    notes: borrower.notes,
    totalOutstanding: borrower.totalOutstanding,
    loans: (loansByBorrower.get(borrower.id) ?? []).map((loan) => ({
      id: loan.id,
      amount: loan.amount,
      outstanding: loan.outstanding,
      dueDate: loan.dueDate,
      status: loan.status,
      isOverdue: loan.isOverdue,
    })),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Borrowers</h1>
          <p className="text-sm text-muted-foreground">
            People who&apos;ve borrowed money from you — what&apos;s outstanding, and when it&apos;s due back.
          </p>
        </div>
        {cards.length > 0 && (
          <div className="shrink-0">
            <BorrowerFormDialog
              trigger={<Button />}
              triggerLabel={
                <>
                  <Plus /> Add borrower
                </>
              }
            />
          </div>
        )}
      </div>

      <BorrowerList borrowers={cards} currency={currency} lendAccounts={lendAccounts} repayAccounts={repayAccounts} />
    </div>
  );
}
