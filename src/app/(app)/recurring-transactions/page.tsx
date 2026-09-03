import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import { AccountService } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import { Button } from "@/components/ui/button";
import { RecurringTransactionFormDialog } from "./recurring-transaction-form-dialog";
import { RecurringTransactionList } from "./recurring-transaction-list";
import type { RecurringTransactionCardData } from "./recurring-transaction-card";

export const metadata = { title: "Recurring Transactions — FinTrack" };

export default async function RecurringTransactionsPage() {
  const userId = await requireAuth();
  const [templates, accounts, categories] = await Promise.all([
    RecurringTransactionService.list(userId),
    AccountService.listWithBalances(userId),
    CategoryService.list(userId),
  ]);

  const currency = accounts[0]?.currency ?? "BDT";
  const dialogAccounts = accounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency }));
  const dialogCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type as "INCOME" | "EXPENSE",
  }));
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const cards: RecurringTransactionCardData[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    type: template.type,
    accountId: template.accountId,
    accountName: accountNameById.get(template.accountId) ?? "Unknown account",
    categoryId: template.categoryId,
    categoryName: categoryNameById.get(template.categoryId) ?? "Unknown category",
    amount: template.amount.toString(),
    frequency: template.frequency,
    startDate: template.startDate,
    endDate: template.endDate,
    description: template.description,
    status: template.status,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Repeating income and expenses — confirm each one from the Dashboard when it&apos;s due.
          </p>
        </div>
        {templates.length > 0 && (
          <RecurringTransactionFormDialog
            accounts={dialogAccounts}
            categories={dialogCategories}
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> New recurring transaction
              </>
            }
          />
        )}
      </div>
      <RecurringTransactionList templates={cards} accounts={dialogAccounts} categories={dialogCategories} currency={currency} />
    </div>
  );
}
