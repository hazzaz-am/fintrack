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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { allocateAction } from "./actions";
import { allocateSchema } from "@/lib/validation/savings-goal";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import type { DialogAccount } from "./savings-goal-form-dialog";

// `goalId` isn't a rendered field - it's a fixed value matching the prop,
// included only so the shared schema (which requires it) validates.
type AllocateValues = z.input<typeof allocateSchema>;

interface AllocateDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  goalId: string;
  goalName: string;
  accounts: DialogAccount[];
}

export function AllocateDialog({ trigger, triggerLabel, goalId, goalName, accounts }: AllocateDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate to {goalName}</DialogTitle>
          <DialogDescription>
            Reserve money within one of your accounts for this goal. The account&apos;s balance doesn&apos;t change.
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <AllocateForm key={String(open)} goalId={goalId} accounts={accounts} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AllocateForm({
  goalId,
  accounts,
  onSuccess,
}: {
  goalId: string;
  accounts: DialogAccount[];
  onSuccess: () => void;
}) {
  const defaultValues: AllocateValues = {
    goalId,
    accountId: accounts[0]?.id ?? "",
    amount: "",
    note: undefined,
  };
  const form = useAppForm({
    defaultValues,
    schema: allocateSchema,
    action: allocateAction.bind(null, goalId),
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
        <form.Field name="accountId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>From account</FieldLabel>
              <NativeSelect
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                {accounts.map((account) => (
                  <NativeSelectOption key={account.id} value={account.id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="amount">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                inputMode="decimal"
                placeholder="0.00"
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="note">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Note</FieldLabel>
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
              {isSubmitting ? "Allocating…" : "Allocate"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
