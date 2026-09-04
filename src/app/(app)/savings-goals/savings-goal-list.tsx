"use client";

import { useState } from "react";
import { ChevronDown, PiggyBank, Plus } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SavingsGoalCard, type SavingsGoalCardData } from "./savings-goal-card";
import { SavingsGoalFormDialog, type DialogAccount } from "./savings-goal-form-dialog";

export function SavingsGoalList({
  goals,
  accounts,
  currency,
}: {
  goals: SavingsGoalCardData[];
  accounts: DialogAccount[];
  currency: string;
}) {
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (goals.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PiggyBank />
          </EmptyMedia>
          <EmptyTitle>No savings goals yet</EmptyTitle>
          <EmptyDescription>
            Set aside money within your accounts for marriage, travel, emergencies, or anything else you&apos;re
            saving for — without moving it out of the account it&apos;s in.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SavingsGoalFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first goal
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  const active = goals.filter((goal) => goal.status !== "ARCHIVED");
  const archived = goals.filter((goal) => goal.status === "ARCHIVED");

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              accounts={accounts}
              otherActiveGoals={active.filter((other) => other.id !== goal.id).map((other) => ({ id: other.id, name: other.name }))}
              currency={currency}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active goals — everything you&apos;ve created has been archived below.
        </p>
      )}

      {archived.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-fit text-muted-foreground" />}>
            <ChevronDown className={cn("transition-transform", archivedOpen && "rotate-180")} />
            Archived goals ({archived.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  accounts={accounts}
                  otherActiveGoals={[]}
                  currency={currency}
                  archived
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
