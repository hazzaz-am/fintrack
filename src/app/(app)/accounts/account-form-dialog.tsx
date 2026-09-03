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
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { createAccountAction, updateAccountAction, type AccountActionState } from "./actions";

const ACCOUNT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "MOBILE_BANKING", label: "Mobile Banking" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
  { value: "OTHER", label: "Other" },
];

const initialState: AccountActionState = {};

export interface EditableAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currency: string;
  description: string | null;
}

interface AccountFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  account?: EditableAccount;
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AccountFormDialog({ trigger, triggerLabel, account }: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(account);
  const action = account ? updateAccountAction.bind(null, account.id) : createAccountAction;
  const [state, formAction] = useActionState(action, initialState);

  // Close on a successful submission without an effect: React docs recommend
  // adjusting state during render (guarded so it only fires once per state
  // change) over `useEffect` for "respond to a prop/state change" cases.
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
          <DialogTitle>{isEdit ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this account's details. Its balance is derived from transactions and can't be edited directly."
              : "Add a place where you keep money — a bank account, mobile wallet, or cash."}
          </DialogDescription>
        </DialogHeader>
        {/*
          Keyed on `open` so each open is a fresh mount: the row's `account`
          prop can change out from under this dialog (e.g. this dialog's own
          edit revalidates the list), and re-mounting instead of updating
          `defaultValue` on a live uncontrolled input avoids stale field
          values / Base UI's "changing defaultValue after init" warning.
        */}
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required maxLength={120} defaultValue={account?.name} />
              <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="type">Type</FieldLabel>
              <NativeSelect id="type" name="type" defaultValue={account?.type ?? "BANK_ACCOUNT"}>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.type?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="institution">Institution</FieldLabel>
              <Input id="institution" name="institution" maxLength={120} defaultValue={account?.institution ?? ""} />
              <FieldError errors={state.fieldErrors?.institution?.map((message) => ({ message }))} />
            </Field>
            {!isEdit && (
              <Field>
                <FieldLabel htmlFor="openingBalance">Opening balance</FieldLabel>
                <Input id="openingBalance" name="openingBalance" inputMode="decimal" defaultValue="0.00" />
                <FieldDescription>The balance this account starts with, before any transactions.</FieldDescription>
                <FieldError errors={state.fieldErrors?.openingBalance?.map((message) => ({ message }))} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Input id="currency" name="currency" maxLength={3} required defaultValue={account?.currency ?? "BDT"} className="uppercase" />
              <FieldError errors={state.fieldErrors?.currency?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={500} defaultValue={account?.description ?? ""} />
              <FieldError errors={state.fieldErrors?.description?.map((message) => ({ message }))} />
            </Field>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <SubmitButton
              label={isEdit ? "Save changes" : "Add account"}
              pendingLabel={isEdit ? "Saving…" : "Adding…"}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
