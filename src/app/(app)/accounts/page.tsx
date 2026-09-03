import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { AccountService } from "@/lib/services/account-service";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "./account-form-dialog";
import { AccountList } from "./account-list";

export const metadata = { title: "Accounts — FinTrack" };

export default async function AccountsPage() {
  const userId = await requireAuth();
  const accounts = await AccountService.listWithBalances(userId);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Every place you keep money, with its balance derived from your transaction history.
          </p>
        </div>
        {accounts.length > 0 && (
          <AccountFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add account
              </>
            }
          />
        )}
      </div>
      <AccountList accounts={accounts} />
    </div>
  );
}
