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
import { updateTransactionAction, type TransactionActionState } from "./actions";
import type { DialogCategory } from "@/components/transactions/record-transaction-dialog";
import type { TransactionListItem } from "@/lib/services/transaction-service";

const initialState: TransactionActionState = {};

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function EditTransactionDialog({
  transaction,
  categories,
  trigger,
  triggerLabel,
}: {
  transaction: TransactionListItem;
  categories: DialogCategory[];
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = updateTransactionAction.bind(null, transaction.id);
  const [state, formAction] = useActionState(action, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  const isTransfer = transaction.type === "TRANSFER" || transaction.type.startsWith("INVESTMENT_");
  const relevantCategories = categories.filter((category) => category.type === transaction.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            {isTransfer
              ? "Transfers and investment movements have no category — you can still adjust the amount, date, and description."
              : "Update this transaction's amount, category, date, or description."}
          </DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            {!isTransfer && (
              <Field>
                <FieldLabel htmlFor="categoryId">Category</FieldLabel>
                <NativeSelect id="categoryId" name="categoryId" defaultValue={transaction.categoryId ?? undefined}>
                  {relevantCategories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={state.fieldErrors?.categoryId?.map((message) => ({ message }))} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input id="amount" name="amount" inputMode="decimal" defaultValue={transaction.amount} />
              <FieldError errors={state.fieldErrors?.amount?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                defaultValue={toDateInputValue(transaction.transactionDate)}
              />
              <FieldError errors={state.fieldErrors?.transactionDate?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={300} defaultValue={transaction.description ?? ""} />
              <FieldDescription>The account this transaction is recorded against can&apos;t be changed here — delete and re-record it instead.</FieldDescription>
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
