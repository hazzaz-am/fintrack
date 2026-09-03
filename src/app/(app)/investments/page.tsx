import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/require-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import { AccountService } from "@/lib/services/account-service";
import { Button } from "@/components/ui/button";
import { InvestmentFormDialog } from "./investment-form-dialog";
import { InvestmentList } from "./investment-list";
import type { InvestmentCardData } from "./investment-card";

export const metadata = { title: "Investments — FinTrack" };

export default async function InvestmentsPage() {
  const userId = await requireAuth();
  const [investments, upcoming, accounts] = await Promise.all([
    InvestmentService.listWithPrincipal(userId),
    InvestmentService.getUpcomingMaturities(userId),
    AccountService.listWithBalances(userId),
  ]);

  const daysUntilMaturityById = new Map(upcoming.map((investment) => [investment.id, investment.daysUntilMaturity]));
  const currency = accounts[0]?.currency ?? "BDT";
  const dialogAccounts = accounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency }));

  // listWithPrincipal spreads the raw Prisma row (design.md's investments
  // spec), so Decimal fields need normalizing to strings before crossing
  // into Client Components — Decimal instances aren't a serializable prop.
  const cards: InvestmentCardData[] = investments.map((investment) => ({
    id: investment.id,
    name: investment.name,
    type: investment.type,
    institution: investment.institution,
    startDate: investment.startDate,
    maturityDate: investment.maturityDate,
    expectedReturnAmount: investment.expectedReturnAmount?.toString() ?? null,
    expectedReturnRate: investment.expectedReturnRate?.toString() ?? null,
    currentValue: investment.currentValue?.toString() ?? null,
    notes: investment.notes,
    status: investment.status,
    principal: investment.principal,
    daysUntilMaturity: daysUntilMaturityById.get(investment.id),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Investments</h1>
          <p className="text-sm text-muted-foreground">
            FDRs, DPS, stocks, and everything else you&apos;ve invested — principal, expected return, and maturity.
          </p>
        </div>
        {investments.length > 0 && (
          <InvestmentFormDialog
            accounts={dialogAccounts}
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add investment
              </>
            }
          />
        )}
      </div>
      <InvestmentList investments={cards} accounts={dialogAccounts} currency={currency} />
    </div>
  );
}
