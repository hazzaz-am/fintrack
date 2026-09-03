import { Pencil, Wallet, HandCoins } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/components/transactions/transaction-format";
import { formatInvestmentType } from "./investment-type-labels";
import { InvestmentFormDialog, type DialogAccount, type EditableInvestment } from "./investment-form-dialog";
import { ContributeDialog } from "./contribute-dialog";
import { RecordMaturityDialog } from "./record-maturity-dialog";

export interface InvestmentCardData {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  startDate: Date;
  maturityDate: Date | null;
  expectedReturnAmount: string | null;
  expectedReturnRate: string | null;
  currentValue: string | null;
  notes: string | null;
  status: string;
  principal: string;
  daysUntilMaturity?: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PLANNED: "secondary",
  ACTIVE: "default",
  MATURED: "outline",
  WITHDRAWN: "outline",
  CANCELLED: "outline",
};

export function InvestmentCard({
  investment,
  accounts,
  currency,
  closed = false,
}: {
  investment: InvestmentCardData;
  accounts: DialogAccount[];
  currency: string;
  closed?: boolean;
}) {
  const overdue = investment.status === "ACTIVE" && (investment.daysUntilMaturity ?? 0) < 0;
  const editable: EditableInvestment = {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    institution: investment.institution,
    startDate: investment.startDate,
    maturityDate: investment.maturityDate,
    expectedReturnAmount: investment.expectedReturnAmount,
    expectedReturnRate: investment.expectedReturnRate,
    currentValue: investment.currentValue,
    notes: investment.notes,
  };

  return (
    <Card className={cn(closed && "opacity-70")}>
      <CardHeader>
        <CardTitle>{investment.name}</CardTitle>
        <CardDescription>
          {formatInvestmentType(investment.type)}
          {investment.institution ? ` · ${investment.institution}` : ""}
        </CardDescription>
        {!closed && (
          <CardAction>
            <InvestmentFormDialog
              accounts={accounts}
              investment={editable}
              trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${investment.name}`} />}
              triggerLabel={<Pencil />}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Principal</span>
          <span className="font-medium tabular-nums">{formatMoney(investment.principal, currency)}</span>
        </div>
        {investment.expectedReturnAmount && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Expected return</span>
            <span className="tabular-nums">
              {formatMoney(investment.expectedReturnAmount, currency)}
              {investment.expectedReturnRate ? ` (${Number(investment.expectedReturnRate).toFixed(1)}%)` : ""}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[investment.status] ?? "outline"} className="capitalize">
            {investment.status.toLowerCase()}
          </Badge>
          {investment.status === "ACTIVE" && investment.maturityDate && (
            <span className={cn("text-xs", overdue ? "text-negative" : "text-muted-foreground")}>
              {overdue
                ? `Overdue by ${Math.abs(investment.daysUntilMaturity ?? 0)} days`
                : investment.daysUntilMaturity !== undefined
                  ? `Matures in ${investment.daysUntilMaturity} days`
                  : null}
            </span>
          )}
        </div>
      </CardContent>
      {!closed && (
        <CardFooter className="flex items-center gap-2">
          {investment.status === "PLANNED" && (
            <ContributeDialog
              investmentId={investment.id}
              investmentName={investment.name}
              accounts={accounts}
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <Wallet /> Fund this
                </>
              }
            />
          )}
          {investment.status === "ACTIVE" && !overdue && (
            <ContributeDialog
              investmentId={investment.id}
              investmentName={investment.name}
              accounts={accounts}
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <Wallet /> Contribute
                </>
              }
            />
          )}
          {investment.status === "ACTIVE" && (
            <RecordMaturityDialog
              investmentId={investment.id}
              investmentName={investment.name}
              accounts={accounts}
              availablePrincipal={investment.principal}
              currency={currency}
              maturityDate={investment.maturityDate}
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <HandCoins /> Record maturity
                </>
              }
            />
          )}
        </CardFooter>
      )}
    </Card>
  );
}
