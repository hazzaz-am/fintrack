"use client";

import { useState } from "react";
import { ChevronDown, Repeat, Plus } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { RecurringTransactionCard, type RecurringTransactionCardData } from "./recurring-transaction-card";
import { RecurringTransactionFormDialog } from "./recurring-transaction-form-dialog";

export function RecurringTransactionList({
  templates,
  accounts,
  categories,
  currency,
}: {
  templates: RecurringTransactionCardData[];
  accounts: DialogAccount[];
  categories: DialogCategory[];
  currency: string;
}) {
  const [inactiveOpen, setInactiveOpen] = useState(false);

  if (templates.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Repeat />
          </EmptyMedia>
          <EmptyTitle>No recurring transactions yet</EmptyTitle>
          <EmptyDescription>
            Set up a template for something that repeats every period — rent, family support, a subscription —
            and you&apos;ll be reminded to confirm it each time it&apos;s due.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <RecurringTransactionFormDialog
            accounts={accounts}
            categories={categories}
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first recurring transaction
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  const active = templates.filter((template) => template.status === "ACTIVE");
  const inactive = templates.filter((template) => template.status === "INACTIVE");

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((template) => (
            <RecurringTransactionCard
              key={template.id}
              template={template}
              accounts={accounts}
              categories={categories}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active templates — everything you&apos;ve created has been deactivated below.</p>
      )}

      {inactive.length > 0 && (
        <Collapsible open={inactiveOpen} onOpenChange={setInactiveOpen}>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-fit text-muted-foreground" />}>
            <ChevronDown className={cn("transition-transform", inactiveOpen && "rotate-180")} />
            Deactivated ({inactive.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {inactive.map((template) => (
                <RecurringTransactionCard
                  key={template.id}
                  template={template}
                  accounts={accounts}
                  categories={categories}
                  currency={currency}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
