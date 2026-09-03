"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { confirmRecurringTransactionAction, type RecurringTransactionActionState } from "./actions";

const initialState: RecurringTransactionActionState = {};

interface ConfirmRecurringDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  templateId: string;
  templateName: string;
  defaultAmount: string;
  defaultDate: string;
  defaultDescription: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Confirming…" : "Confirm"}
    </Button>
  );
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
  const action = confirmRecurringTransactionAction.bind(null, templateId);
  const [state, formAction] = useActionState(action, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm &quot;{templateName}&quot;</DialogTitle>
          <DialogDescription>Review the amount and date before recording this transaction.</DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input id="amount" name="amount" inputMode="decimal" required defaultValue={defaultAmount} />
              <FieldError errors={state.fieldErrors?.amount?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
              <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={defaultDate} />
              <FieldError errors={state.fieldErrors?.transactionDate?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={300} defaultValue={defaultDescription} />
              <FieldError errors={state.fieldErrors?.description?.map((message) => ({ message }))} />
            </Field>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
