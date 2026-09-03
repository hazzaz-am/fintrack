"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { deleteCategoryAction, getCategoryUsageCountAction } from "./actions";

export function DeleteCategoryDialog({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUsageCount(null);
          startTransition(async () => {
            const count = await getCategoryUsageCountAction(categoryId);
            setUsageCount(count);
          });
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Delete ${categoryName}`} />}>
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {categoryName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {usageCount === null ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-3.5" /> Checking usage…
              </span>
            ) : usageCount > 0 ? (
              `${usageCount} transaction${usageCount === 1 ? "" : "s"} still ${usageCount === 1 ? "references" : "reference"} this category. Reassign ${usageCount === 1 ? "it" : "them"} to a different category on the Transactions screen before deleting.`
            ) : (
              "This category isn't used by any transactions. This can't be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{usageCount !== null && usageCount > 0 ? "Close" : "Cancel"}</AlertDialogCancel>
          {usageCount === 0 && (
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => {
                startTransition(async () => {
                  await deleteCategoryAction(categoryId);
                  setOpen(false);
                });
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
