"use client";

import { useState } from "react";
import type { z } from "zod";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { confirmRecurringTransactionAction } from "./actions";
import { confirmRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

// `z.coerce.date()`'s input type is intentionally `unknown` - override
// `transactionDate` back to the plain date string this form binds.
type ConfirmRecurringValues = Omit<z.input<typeof confirmRecurringTransactionSchema>, "transactionDate"> & {
  transactionDate: string | undefined;
};

interface ConfirmRecurringDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  templateId: string;
  templateName: string;
  defaultAmount: string;
  defaultDate: string;
  defaultDescription: string;
}

// A due template is never confirmed automatically (recurring-transactions
// spec) — this dialog is the one explicit action that turns it into a real
// Transaction, with amount/date/description editable before saving.
export function ConfirmRecurringDialog({
  trigger,
  triggerLabel,
  templateId,
  templateName,
  defaultAmount,
  defaultDate,
  defaultDescription,
}: ConfirmRecurringDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm &quot;{templateName}&quot;</DialogTitle>
          <DialogDescription>Review the amount and date before recording this transaction.</DialogDescription>
        </DialogHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <ConfirmRecurringForm
          key={String(open)}
          templateId={templateId}
          defaultAmount={defaultAmount}
          defaultDate={defaultDate}
          defaultDescription={defaultDescription}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRecurringForm({
  templateId,
  defaultAmount,
  defaultDate,
  defaultDescription,
  onSuccess,
}: {
  templateId: string;
  defaultAmount: string;
  defaultDate: string;
  defaultDescription: string;
  onSuccess: () => void;
}) {
  const defaultValues: ConfirmRecurringValues = {
    amount: defaultAmount,
    transactionDate: defaultDate,
    description: defaultDescription || undefined,
  };
  const form = useAppForm({
    defaultValues,
    schema: confirmRecurringTransactionSchema as unknown as z.ZodType<unknown, ConfirmRecurringValues>,
    action: confirmRecurringTransactionAction.bind(null, templateId),
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="amount">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                inputMode="decimal"
                value={field.state.value ?? ""}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="transactionDate">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Date</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="date"
                value={field.state.value ?? ""}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                maxLength={300}
                value={field.state.value ?? ""}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
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
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Confirming…" : "Confirm"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
