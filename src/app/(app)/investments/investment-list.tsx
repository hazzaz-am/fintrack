"use client";

import { useState } from "react";
import { ChevronDown, LineChart, Plus } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { InvestmentCard, type InvestmentCardData } from "./investment-card";
import { InvestmentFormDialog, type DialogAccount } from "./investment-form-dialog";

const CLOSED_STATUSES = new Set(["MATURED", "WITHDRAWN", "CANCELLED"]);

export function InvestmentList({
  investments,
  accounts,
  currency,
}: {
  investments: InvestmentCardData[];
  accounts: DialogAccount[];
  currency: string;
}) {
  const [pastOpen, setPastOpen] = useState(false);

  if (investments.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LineChart />
          </EmptyMedia>
          <EmptyTitle>No investments yet</EmptyTitle>
          <EmptyDescription>
            Track FDRs, DPS, stocks, or any other investment — where it&apos;s held, what it&apos;s expected to return, and when it matures.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <InvestmentFormDialog
            accounts={accounts}
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first investment
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  const open = investments.filter((investment) => !CLOSED_STATUSES.has(investment.status));
  const closed = investments.filter((investment) => CLOSED_STATUSES.has(investment.status));

  return (
    <div className="flex flex-col gap-4">
      {open.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((investment) => (
            <InvestmentCard key={investment.id} investment={investment} accounts={accounts} currency={currency} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active or planned investments — everything you&apos;ve recorded has been closed out below.
        </p>
      )}

      {closed.length > 0 && (
        <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" />
            }
          >
            <ChevronDown className={cn("transition-transform", pastOpen && "rotate-180")} />
            Past investments ({closed.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((investment) => (
                <InvestmentCard key={investment.id} investment={investment} accounts={accounts} currency={currency} closed />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
