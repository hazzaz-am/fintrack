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
import { contributeAction, type InvestmentActionState } from "./actions";
import type { DialogAccount } from "./investment-form-dialog";

const initialState: InvestmentActionState = {};

interface ContributeDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  investmentId: string;
  investmentName: string;
  accounts: DialogAccount[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Recording…" : "Record contribution"}
    </Button>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ContributeDialog({ trigger, triggerLabel, investmentId, investmentName, accounts }: ContributeDialogProps) {
  const [open, setOpen] = useState(false);
  const action = contributeAction.bind(null, investmentId);
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
          <DialogTitle>Contribute to {investmentName}</DialogTitle>
          <DialogDescription>Fund this investment from one of your accounts.</DialogDescription>
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
              <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
              <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={today()} />
              <FieldError errors={state.fieldErrors?.transactionDate?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={300} />
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
