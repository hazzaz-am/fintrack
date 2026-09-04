import { Pencil, Plus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import type { AccountWithBalance } from "@/lib/services/account-service";
import { AccountFormDialog } from "./account-form-dialog";
import { ArchiveAccountDialog } from "./archive-account-dialog";
import { formatAccountType, formatMoney } from "./account-type-labels";
import { cn } from "@/lib/utils";

export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  if (accounts.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wallet />
          </EmptyMedia>
          <EmptyTitle>No accounts yet</EmptyTitle>
          <EmptyDescription>
            Add the bank accounts, mobile wallets, or cash you keep money in to start tracking your balance.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AccountFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first account
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {accounts.map((account) => {
        const balance = Number(account.balance);
        const subtitleParts = [
          formatAccountType(account.type),
          account.currency,
          account.institution ?? undefined,
        ].filter(Boolean);
        return (
          <li key={account.id}>
            <ListRow
              icon={<Wallet />}
              title={account.name}
              subtitle={subtitleParts.join(" · ")}
              trailing={
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "tabular-nums",
                        balance > 0 && "text-positive",
                        balance < 0 && "text-negative"
                      )}
                    >
                      {formatMoney(account.balance, account.currency)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {account.status.toLowerCase()}
                    </Badge>
                  </div>
                  <AccountFormDialog
                    account={{
                      id: account.id,
                      name: account.name,
                      type: account.type,
                      institution: account.institution,
                      currency: account.currency,
                      description: account.description,
                    }}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`} />}
                    triggerLabel={<Pencil />}
                  />
                  <ArchiveAccountDialog accountId={account.id} accountName={account.name} />
                </div>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
