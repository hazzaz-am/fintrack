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
import { writeOffPromiseAction } from "./reservation-actions";

export function WriteOffPromiseDialog({
  promiseId,
  goalName,
  remainingAmount,
  currency,
}: {
  promiseId: string;
  goalName: string;
  remainingAmount: string;
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
          <AlertDialogTitle>Write off {currency} {remainingAmount}?</AlertDialogTitle>
          <AlertDialogDescription>
            This accepts that the {currency} {remainingAmount} still owed to {goalName} won&apos;t be coming back.
            The goal&apos;s reserved balance stays reduced by this amount, and this reminder stops appearing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            onClick={() => {
              startTransition(async () => {
                await writeOffPromiseAction(promiseId);
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
