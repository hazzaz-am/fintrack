"use client";

import { useState } from "react";
import { ChevronDown, HandCoins, Pencil, Plus, Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatMoney, formatTransactionDate } from "@/components/transactions/transaction-format";
import { BorrowerFormDialog } from "./borrower-form-dialog";
import { LendDialog, type LendAccountOption } from "./lend-dialog";
import { RepayDialog, type RepayAccountOption } from "./repay-dialog";
import { WriteOffLoanDialog } from "./write-off-loan-dialog";
import { ChangeDueDateDialog } from "./change-due-date-dialog";

export interface LoanCardData {
  id: string;
  amount: string;
  outstanding: string;
  dueDate: Date;
  status: string;
  isOverdue: boolean;
}

export interface BorrowerCardData {
  id: string;
  name: string;
  notes: string | null;
  totalOutstanding: string;
  loans: LoanCardData[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "default",
  PARTIALLY_REPAID: "secondary",
  REPAID: "outline",
  WRITTEN_OFF: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_REPAID: "Partially repaid",
  REPAID: "Repaid",
  WRITTEN_OFF: "Written off",
};

const CLOSED_STATUSES = new Set(["REPAID", "WRITTEN_OFF"]);

function LoanRow({
  loan,
  currency,
  accounts,
  borrowerName,
}: {
  loan: LoanCardData;
  currency: string;
  accounts: RepayAccountOption[];
  borrowerName: string;
}) {
  const closed = CLOSED_STATUSES.has(loan.status);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium tabular-nums">{formatMoney(loan.amount, currency)}</span>
        <Badge variant={STATUS_VARIANT[loan.status] ?? "outline"}>{STATUS_LABEL[loan.status] ?? loan.status}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {closed ? "Outstanding" : "Owed"}: {formatMoney(loan.outstanding, currency)}
        </span>
        <span className={cn(loan.isOverdue && "font-medium text-negative")}>
          {loan.isOverdue ? "Overdue since " : "Due "}
          {formatTransactionDate(loan.dueDate)}
        </span>
      </div>
      {!closed && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <RepayDialog
            loanId={loan.id}
            borrowerName={borrowerName}
            outstanding={loan.outstanding}
            currency={currency}
            accounts={accounts}
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={
              <>
                <Wallet /> Repay
              </>
            }
          />
          <ChangeDueDateDialog
            loanId={loan.id}
            currentDueDate={loan.dueDate}
            trigger={<Button variant="ghost" size="sm" />}
            triggerLabel="Change due date"
          />
          <WriteOffLoanDialog loanId={loan.id} borrowerName={borrowerName} outstanding={loan.outstanding} currency={currency} />
        </div>
      )}
    </div>
  );
}

export function BorrowerCard({
  borrower,
  currency,
  lendAccounts,
  repayAccounts,
}: {
  borrower: BorrowerCardData;
  currency: string;
  lendAccounts: LendAccountOption[];
  repayAccounts: RepayAccountOption[];
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const openLoans = borrower.loans.filter((loan) => !CLOSED_STATUSES.has(loan.status));
  const closedLoans = borrower.loans.filter((loan) => CLOSED_STATUSES.has(loan.status));
  const hasOverdue = openLoans.some((loan) => loan.isOverdue);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <HandCoins className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>{borrower.name}</CardTitle>
            {borrower.notes && <CardDescription>{borrower.notes}</CardDescription>}
          </div>
        </div>
        <CardAction>
          <BorrowerFormDialog
            borrower={{ id: borrower.id, name: borrower.name, notes: borrower.notes }}
            trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${borrower.name}`} />}
            triggerLabel={<Pencil />}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Outstanding</span>
          <span className={cn("font-medium tabular-nums", hasOverdue && "text-negative")}>
            {formatMoney(borrower.totalOutstanding, currency)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LendDialog
            borrowerId={borrower.id}
            borrowerName={borrower.name}
            accounts={lendAccounts}
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={
              <>
                <Plus /> Lend
              </>
            }
          />
        </div>

        {borrower.loans.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-fit text-muted-foreground" />}>
              <ChevronDown className={cn("transition-transform", historyOpen && "rotate-180")} />
              Loans ({borrower.loans.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-2 pt-2">
                {openLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} currency={currency} accounts={repayAccounts} borrowerName={borrower.name} />
                ))}
                {closedLoans.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} currency={currency} accounts={repayAccounts} borrowerName={borrower.name} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
