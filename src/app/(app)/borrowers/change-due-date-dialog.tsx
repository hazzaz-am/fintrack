"use client";

import { useState } from "react";
import type { z } from "zod";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateLoanDueDateAction } from "./actions";
import { updateLoanDueDateSchema } from "@/lib/validation/borrower";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

export function ChangeDueDateDialog({
  trigger,
  triggerLabel,
  loanId,
  currentDueDate,
}: {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  loanId: string;
  currentDueDate: Date | string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Change due date</DrawerTitle>
          <DrawerDescription>The amount and account of this loan can&apos;t be changed — only when it&apos;s due.</DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <ChangeDueDateForm
          key={String(open)}
          loanId={loanId}
          currentDueDate={currentDueDate}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function ChangeDueDateForm({
  loanId,
  currentDueDate,
  onSuccess,
}: {
  loanId: string;
  currentDueDate: Date | string;
  onSuccess: () => void;
}) {
  const d = typeof currentDueDate === "string" ? new Date(currentDueDate) : currentDueDate;
  const form = useAppForm({
    defaultValues: { dueDate: d.toISOString().slice(0, 10) },
    schema: updateLoanDueDateSchema as unknown as z.ZodType<unknown, { dueDate: string }>,
    action: updateLoanDueDateAction.bind(null, loanId),
    onSuccess: (state) => {
      if (state.success) onSuccess();
    },
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <FieldGroup>
          <form.Field name="dueDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Due date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(formError) =>
              formError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {String(formError)}
                </p>
              ) : null
            }
          </form.Subscribe>
        </FieldGroup>
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Saving…" : "Save due date"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}
