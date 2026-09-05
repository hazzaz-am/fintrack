"use client";

import { useState } from "react";
import type { z } from "zod";
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { updateTransactionAction } from "./actions";
import { updateTransactionSchema } from "@/lib/validation/transaction";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import type { DialogCategory } from "@/components/transactions/record-transaction-dialog";
import type { TransactionListItem } from "@/lib/services/transaction-service";

// `z.input<...>` reports `transactionDate` as `unknown` because `z.coerce.date()`'s
// input type is intentionally unknown - override it back to the date string this
// form binds. `vatAmount`/`description` use `null` (not `undefined`) for "cleared",
// matching the schema's `.nullable()` and the Server Action's `orNull` semantics.
type EditTransactionValues = Omit<
  z.input<typeof updateTransactionSchema>,
  "transactionDate" | "vatAmount" | "description"
> & {
  transactionDate: string;
  vatAmount: string | null;
  description: string | null;
};

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit transaction</DrawerTitle>
          <DrawerDescription>
            {transaction.type === "TRANSFER" || transaction.type.startsWith("INVESTMENT_")
              ? "Transfers and investment movements have no category — you can still adjust the amount, date, and description."
              : "Update this transaction's amount, category, date, or description."}
          </DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <EditTransactionForm
          key={String(open)}
          transaction={transaction}
          categories={categories}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function EditTransactionForm({
  transaction,
  categories,
  onSuccess,
}: {
  transaction: TransactionListItem;
  categories: DialogCategory[];
  onSuccess: () => void;
}) {
  const isTransfer = transaction.type === "TRANSFER" || transaction.type.startsWith("INVESTMENT_");
  const relevantCategories = categories.filter((category) => category.type === transaction.type);
  const showVat = transaction.type === "EXPENSE" || transaction.type === "TRANSFER";

  const defaultValues: EditTransactionValues = {
    categoryId: transaction.categoryId ?? undefined,
    amount: transaction.amount,
    vatAmount: transaction.vatAmount ?? null,
    transactionDate: toDateInputValue(transaction.transactionDate),
    description: transaction.description ?? null,
  };
  const form = useAppForm({
    defaultValues,
    schema: updateTransactionSchema as unknown as z.ZodType<unknown, EditTransactionValues>,
    action: updateTransactionAction.bind(null, transaction.id),
    onSuccess,
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <FieldGroup>
          {!isTransfer && (
            <form.Field name="categoryId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                  <NativeSelect
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ""}
                    onBlur={() => handleFieldBlur(field)}
                    onChange={(e) => field.handleChange(e.target.value)}
                  >
                    {relevantCategories.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <AppFieldError field={field} />
                </Field>
              )}
            </form.Field>
          )}
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
          {showVat && (
            <form.Field name="vatAmount">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>VAT (optional)</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={field.state.value ?? ""}
                    onBlur={() => handleFieldBlur(field)}
                    onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                  />
                  <FieldDescription>
                    Deducted from the {transaction.type === "TRANSFER" ? "from account" : "account"} in addition to
                    the amount above.
                  </FieldDescription>
                  <AppFieldError field={field} />
                </Field>
              )}
            </form.Field>
          )}
          <form.Field name="transactionDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value}
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
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <FieldDescription>
                  The account this transaction is recorded against can&apos;t be changed here — delete and re-record
                  it instead.
                </FieldDescription>
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
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}
