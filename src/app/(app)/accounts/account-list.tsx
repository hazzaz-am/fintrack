import { Pencil, Plus, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="w-0">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => {
          const balance = Number(account.balance);
          return (
            <TableRow key={account.id}>
              <TableCell>
                <div className="font-medium">{account.name}</div>
                {account.institution && (
                  <div className="text-xs text-muted-foreground">{account.institution}</div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatAccountType(account.type)}</TableCell>
              <TableCell className="text-muted-foreground">{account.currency}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {account.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  balance > 0 && "text-positive",
                  balance < 0 && "text-negative"
                )}
              >
                {formatMoney(account.balance, account.currency)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
