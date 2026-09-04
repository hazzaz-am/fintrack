"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { formatTransactionType } from "@/components/transactions/transaction-format";
import { FREQUENCY_LABELS } from "./frequency-labels";
import { createRecurringTransactionAction, updateRecurringTransactionAction, type RecurringTransactionActionState } from "./actions";

const initialState: RecurringTransactionActionState = {};

export interface EditableRecurringTransaction {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  accountId: string;
  categoryId: string;
  amount: string;
  frequency: string;
  startDate: Date | string;
  endDate: Date | string | null;
  description: string | null;
}

interface RecurringTransactionFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  accounts: DialogAccount[];
  categories: DialogCategory[];
  template?: EditableRecurringTransaction;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create template"}
    </Button>
  );
}

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringTransactionFormDialog({
  trigger,
  triggerLabel,
  accounts,
  categories,
  template,
}: RecurringTransactionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(template);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(template?.type ?? "EXPENSE");
  const action = template ? updateRecurringTransactionAction.bind(null, template.id) : createRecurringTransactionAction;
  const [state, formAction] = useActionState(action, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  const filteredCategories = categories.filter((category) => category.type === type);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setType(template?.type ?? "EXPENSE");
      }}
    >
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit recurring transaction" : "New recurring transaction"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Changes only apply to future occurrences — transactions already generated from this template keep their own recorded values."
              : "A repeating income or expense you'll be reminded to confirm each period, like rent or a monthly family payment."}
          </DrawerDescription>
        </DrawerHeader>
        <form
          key={`${String(open)}-${isEdit ? "edit" : type}`}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required maxLength={120} defaultValue={template?.name} />
              <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
            </Field>

            {isEdit ? (
              <FieldDescription>Type: {formatTransactionType(template!.type)} (not editable)</FieldDescription>
            ) : (
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Tabs value={type} onValueChange={(value) => setType(value as "INCOME" | "EXPENSE")}>
                  <TabsList>
                    <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
                    <TabsTrigger value="INCOME">Income</TabsTrigger>
                  </TabsList>
                </Tabs>
                <input type="hidden" name="type" value={type} />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="accountId">Account</FieldLabel>
              <NativeSelect id="accountId" name="accountId" defaultValue={template?.accountId ?? accounts[0]?.id}>
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
              <NativeSelect id="categoryId" name="categoryId" defaultValue={template?.categoryId}>
                {filteredCategories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.categoryId?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input id="amount" name="amount" inputMode="decimal" required placeholder="0.00" defaultValue={template?.amount} />
              <FieldError errors={state.fieldErrors?.amount?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
              <NativeSelect id="frequency" name="frequency" defaultValue={template?.frequency ?? "MONTHLY"}>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.frequency?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={template ? toDateInputValue(template.startDate) : today()}
              />
              <FieldError errors={state.fieldErrors?.startDate?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="endDate">End date</FieldLabel>
              <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(template?.endDate)} />
              <FieldDescription>Leave blank for a template with no fixed end.</FieldDescription>
              <FieldError errors={state.fieldErrors?.endDate?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={300} defaultValue={template?.description ?? ""} />
              <FieldError errors={state.fieldErrors?.description?.map((message) => ({ message }))} />
            </Field>

            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          </div>
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
            <SubmitButton isEdit={isEdit} />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
