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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { recordTransactionAction, type TransactionActionState } from "@/app/(app)/transactions/actions";

export interface DialogAccount {
  id: string;
  name: string;
  currency: string;
}

export interface DialogCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

export type TransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";

interface RecordTransactionDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  accounts: DialogAccount[];
  categories: DialogCategory[];
  defaultType?: TransactionKind;
  defaultAccountId?: string;
}

const initialState: TransactionActionState = {};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function RecordTransactionDialog({
  trigger,
  triggerLabel,
  accounts,
  categories,
  defaultType = "EXPENSE",
  defaultAccountId,
}: RecordTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TransactionKind>(defaultType);
  const [state, formAction] = useActionState(recordTransactionAction, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  const incomeCategories = categories.filter((category) => category.type === "INCOME");
  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setKind(defaultType);
      }}
    >
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a transaction</DialogTitle>
          <DialogDescription>Record income, an expense, or a transfer between your own accounts.</DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={(value) => setKind(value as TransactionKind)}>
          <TabsList>
            <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
            <TabsTrigger value="INCOME">Income</TabsTrigger>
            <TabsTrigger value="TRANSFER">Transfer</TabsTrigger>
          </TabsList>
          {/* Keyed on open+kind so each tab/open is a fresh, uncontrolled mount (same rationale as AccountFormDialog). */}
          <form key={`${String(open)}-${kind}`} action={formAction}>
            <input type="hidden" name="kind" value={kind} />
            <FieldGroup>
              {kind === "TRANSFER" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="sourceAccountId">From account</FieldLabel>
                    <NativeSelect id="sourceAccountId" name="sourceAccountId" defaultValue={defaultAccountId ?? accounts[0]?.id}>
                      {accounts.map((account) => (
                        <NativeSelectOption key={account.id} value={account.id}>
                          {account.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={state.fieldErrors?.sourceAccountId?.map((message) => ({ message }))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="destinationAccountId">To account</FieldLabel>
                    <NativeSelect id="destinationAccountId" name="destinationAccountId" defaultValue={accounts[1]?.id ?? accounts[0]?.id}>
                      {accounts.map((account) => (
                        <NativeSelectOption key={account.id} value={account.id}>
                          {account.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={state.fieldErrors?.destinationAccountId?.map((message) => ({ message }))} />
                  </Field>
                </>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="accountId">Account</FieldLabel>
                    <NativeSelect id="accountId" name="accountId" defaultValue={defaultAccountId ?? accounts[0]?.id}>
                      {accounts.map((account) => (
                        <NativeSelectOption key={account.id} value={account.id}>
                          {account.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={state.fieldErrors?.accountId?.map((message) => ({ message }))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="categoryId">Category</FieldLabel>
                    <NativeSelect id="categoryId" name="categoryId">
                      {(kind === "INCOME" ? incomeCategories : expenseCategories).map((category) => (
                        <NativeSelectOption key={category.id} value={category.id}>
                          {category.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={state.fieldErrors?.categoryId?.map((message) => ({ message }))} />
                  </Field>
                </>
              )}
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
              <SubmitButton
                label={kind === "TRANSFER" ? "Record transfer" : kind === "INCOME" ? "Record income" : "Record expense"}
              />
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
