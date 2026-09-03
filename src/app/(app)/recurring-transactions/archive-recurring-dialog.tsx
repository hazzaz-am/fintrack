"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
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
import { archiveRecurringTransactionAction } from "./actions";

// No un-archive path (design.md D28) — the confirmation step exists because
// this is one-way, unlike a plain edit.
export function ArchiveRecurringDialog({ templateId, name }: { templateId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Deactivate ${name}`} />}>
        <Archive />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate &quot;{name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            It will stop appearing as due and can&apos;t be reactivated — create a new template if you need it again.
            Transactions already generated from it are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            onClick={() => {
              startTransition(async () => {
                await archiveRecurringTransactionAction(templateId);
                setOpen(false);
              });
            }}
          >
            {pending ? "Deactivating…" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
