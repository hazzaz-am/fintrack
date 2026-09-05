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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { DialogAccount, DialogCategory } from "@/components/transactions/record-transaction-dialog";
import { formatTransactionType } from "@/components/transactions/transaction-format";
import { FREQUENCY_LABELS } from "./frequency-labels";
import { createRecurringTransactionAction, updateRecurringTransactionAction } from "./actions";
import { createRecurringTransactionSchema, updateRecurringTransactionSchema } from "@/lib/validation/recurring-transaction";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

// `z.coerce.date()`'s input type is intentionally `unknown` - override
// startDate/endDate back to the plain date strings these forms bind.
type CreateRecurringValues = Omit<z.input<typeof createRecurringTransactionSchema>, "startDate" | "endDate"> & {
  startDate: string;
  endDate: string | undefined;
};
type UpdateRecurringValues = Omit<z.input<typeof updateRecurringTransactionSchema>, "startDate" | "endDate"> & {
  startDate: string | undefined;
  endDate: string | null;
};

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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
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
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        {template ? (
          <EditRecurringForm
            key={String(open)}
            template={template}
            accounts={accounts}
            categories={categories}
            onSuccess={() => setOpen(false)}
          />
        ) : (
          <CreateRecurringForm
            key={String(open)}
            accounts={accounts}
            categories={categories}
            onSuccess={() => setOpen(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CreateRecurringForm({
  accounts,
  categories,
  onSuccess,
}: {
  accounts: DialogAccount[];
  categories: DialogCategory[];
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const filteredCategories = categories.filter((category) => category.type === type);

  const defaultValues: CreateRecurringValues = {
    name: "",
    accountId: accounts[0]?.id ?? "",
    categoryId: filteredCategories[0]?.id ?? "",
    type,
    amount: "",
    frequency: "MONTHLY",
    startDate: today(),
    endDate: undefined,
    description: undefined,
  };
  const form = useAppForm({
    defaultValues,
    schema: createRecurringTransactionSchema as unknown as z.ZodType<unknown, CreateRecurringValues>,
    action: createRecurringTransactionAction,
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
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={120}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <Field>
            <FieldLabel>Type</FieldLabel>
            <Tabs
              value={type}
              onValueChange={(value) => {
                const next = value as "INCOME" | "EXPENSE";
                setType(next);
                form.setFieldValue("type", next);
                const nextCategory = categories.find((category) => category.type === next);
                form.setFieldValue("categoryId", nextCategory?.id ?? "");
              }}
            >
              <TabsList>
                <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
                <TabsTrigger value="INCOME">Income</TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>

          <form.Field name="accountId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Account</FieldLabel>
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

          <form.Field name="categoryId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {filteredCategories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
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

          <form.Field name="frequency">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Frequency</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value as CreateRecurringValues["frequency"])}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <form.Field name="startDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Start date</FieldLabel>
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

          <form.Field name="endDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>End date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <FieldDescription>Leave blank for a template with no fixed end.</FieldDescription>
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
      </div>
      <DrawerFooter>
        <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating…" : "Create template"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}

function EditRecurringForm({
  template,
  accounts,
  categories,
  onSuccess,
}: {
  template: EditableRecurringTransaction;
  accounts: DialogAccount[];
  categories: DialogCategory[];
  onSuccess: () => void;
}) {
  const filteredCategories = categories.filter((category) => category.type === template.type);

  const defaultValues: UpdateRecurringValues = {
    name: template.name,
    accountId: template.accountId,
    categoryId: template.categoryId,
    amount: template.amount,
    frequency: template.frequency as UpdateRecurringValues["frequency"],
    startDate: toDateInputValue(template.startDate),
    endDate: toDateInputValue(template.endDate) || null,
    description: template.description,
  };
  const form = useAppForm({
    defaultValues,
    schema: updateRecurringTransactionSchema as unknown as z.ZodType<unknown, UpdateRecurringValues>,
    action: updateRecurringTransactionAction.bind(null, template.id),
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
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={120}
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <FieldDescription>Type: {formatTransactionType(template.type)} (not editable)</FieldDescription>

          <form.Field name="accountId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Account</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ""}
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
                  {filteredCategories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
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
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <form.Field name="frequency">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Frequency</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value as UpdateRecurringValues["frequency"])}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <form.Field name="startDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Start date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <form.Field name="endDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>End date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <FieldDescription>Leave blank for a template with no fixed end.</FieldDescription>
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
