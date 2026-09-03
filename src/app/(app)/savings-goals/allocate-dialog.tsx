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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { allocateAction, type SavingsGoalActionState } from "./actions";
import type { DialogAccount } from "./savings-goal-form-dialog";

const initialState: SavingsGoalActionState = {};

interface AllocateDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  goalId: string;
  goalName: string;
  accounts: DialogAccount[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Allocating…" : "Allocate"}
    </Button>
  );
}

export function AllocateDialog({ trigger, triggerLabel, goalId, goalName, accounts }: AllocateDialogProps) {
  const [open, setOpen] = useState(false);
  const action = allocateAction.bind(null, goalId);
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
          <DialogTitle>Allocate to {goalName}</DialogTitle>
          <DialogDescription>
            Reserve money within one of your accounts for this goal. The account&apos;s balance doesn&apos;t change.
          </DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="accountId">From account</FieldLabel>
              <NativeSelect id="accountId" name="accountId" defaultValue={accounts[0]?.id}>
                {accounts.map((account) => (
                  <NativeSelectOption key={account.id} value={account.id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.accountId?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input id="amount" name="amount" inputMode="decimal" required placeholder="0.00" />
              <FieldError errors={state.fieldErrors?.amount?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="note">Note</FieldLabel>
              <Input id="note" name="note" maxLength={300} />
              <FieldError errors={state.fieldErrors?.note?.map((message) => ({ message }))} />
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
