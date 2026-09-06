"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { writeOffLoanAction } from "./actions";
import { formatMoney } from "@/components/transactions/transaction-format";

export function WriteOffLoanDialog({
  loanId,
  borrowerName,
  outstanding,
  currency,
}: {
  loanId: string;
  borrowerName: string;
  outstanding: string;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <XCircle /> Write off
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Write off {formatMoney(outstanding, currency)}?</AlertDialogTitle>
          <AlertDialogDescription>
            This accepts that the {formatMoney(outstanding, currency)} {borrowerName} still owes on this loan won&apos;t be
            coming back. The loan closes and stops showing up as overdue — this can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            onClick={() => {
              startTransition(async () => {
                await writeOffLoanAction(loanId);
                setOpen(false);
              });
            }}
          >
            {pending ? "Writing off…" : "Write off"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
