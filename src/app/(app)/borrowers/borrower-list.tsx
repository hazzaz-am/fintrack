"use client";

import { HandCoins, Plus } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { BorrowerCard, type BorrowerCardData } from "./borrower-card";
import { BorrowerFormDialog } from "./borrower-form-dialog";
import type { LendAccountOption } from "./lend-dialog";
import type { RepayAccountOption } from "./repay-dialog";

export function BorrowerList({
  borrowers,
  currency,
  lendAccounts,
  repayAccounts,
}: {
  borrowers: BorrowerCardData[];
  currency: string;
  lendAccounts: LendAccountOption[];
  repayAccounts: RepayAccountOption[];
}) {
  if (borrowers.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HandCoins />
          </EmptyMedia>
          <EmptyTitle>No borrowers yet</EmptyTitle>
          <EmptyDescription>
            Track money you lend to people — who owes you, how much, and when it&apos;s due back.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <BorrowerFormDialog
            trigger={<Button />}
            triggerLabel={
              <>
                <Plus /> Add your first borrower
              </>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {borrowers.map((borrower) => (
        <BorrowerCard
          key={borrower.id}
          borrower={borrower}
          currency={currency}
          lendAccounts={lendAccounts}
          repayAccounts={repayAccounts}
        />
      ))}
    </div>
  );
}
