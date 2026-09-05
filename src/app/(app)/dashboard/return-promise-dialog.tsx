"use client";

import { z } from "zod";
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { returnAgainstPromiseAction } from "./reservation-actions";
import { returnAgainstPromiseSchema } from "@/lib/validation/goal-reservation";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { useState } from "react";

type ReturnValues = z.input<typeof returnAgainstPromiseSchema>;

interface ReturnPromiseDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  promiseId: string;
  goalName: string;
  remainingAmount: string;
  currency: string;
}

export function ReturnPromiseDialog({
  trigger,
  triggerLabel,
  promiseId,
  goalName,
  remainingAmount,
  currency,
}: ReturnPromiseDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return money to {goalName}</DialogTitle>
          <DialogDescription>
            Record that some or all of the {currency} {remainingAmount} still owed has come back. This restores that
            much of the goal&apos;s reserved balance.
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on every open (key) so field state doesn't carry over between opens. */}
        <ReturnForm
          key={String(open)}
          promiseId={promiseId}
          remainingAmount={remainingAmount}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReturnForm({
  promiseId,
  remainingAmount,
  onSuccess,
}: {
  promiseId: string;
  remainingAmount: string;
  onSuccess: () => void;
}) {
  const defaultValues: ReturnValues = { amount: remainingAmount };
  const schema = returnAgainstPromiseSchema.superRefine((data, ctx) => {
    if (Number(data.amount) > Number(remainingAmount)) {
      ctx.addIssue({
        code: "custom",
        message: `Only ${remainingAmount} remains outstanding on this promise.`,
        path: ["amount"],
      });
    }
  });

  const form = useAppForm({
    defaultValues,
    schema: schema as unknown as z.ZodType<unknown, ReturnValues>,
    action: returnAgainstPromiseAction.bind(null, promiseId),
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
              <FieldLabel htmlFor={field.name}>Amount returned</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                inputMode="decimal"
                placeholder="0.00"
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldDescription>Enter less than the full amount to record a partial return.</FieldDescription>
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
              {isSubmitting ? "Recording…" : "Record return"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
