"use client";

import { useState } from "react";
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
import { recordTransactionAction, type TransactionActionState } from "@/app/(app)/transactions/actions";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { useReservationGate } from "@/lib/forms/use-reservation-gate";
import { ReservationConsentWizard } from "@/components/goal-reservation/reservation-consent-wizard";
import { AppFieldError } from "@/lib/forms/app-field-error";
import type { z } from "zod";
import { recordIncomeOrExpenseSchema, recordTransferSchema } from "@/lib/validation/transaction";

// `z.input<...>` reports `transactionDate` as `unknown` because `z.coerce.date()`'s
// input type is intentionally unknown (it accepts anything coercible) - override it
// back to the plain date string these forms actually bind to `<input type="date">`.
type RecordIncomeOrExpenseValues = Omit<z.input<typeof recordIncomeOrExpenseSchema>, "transactionDate"> & {
  transactionDate: string;
};
type RecordTransferValues = Omit<z.input<typeof recordTransferSchema>, "transactionDate"> & {
  transactionDate: string;
};

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bakes the given `kind` into the shared `recordTransactionAction`'s FormData, so each tab's form doesn't need its own Server Action. */
function recordAction(kind: TransactionKind) {
  return (prevState: TransactionActionState, formData: FormData) => {
    formData.set("kind", kind);
    return recordTransactionAction(prevState, formData);
  };
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

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setKind(defaultType);
      }}
    >
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Record a transaction</DrawerTitle>
          <DrawerDescription>Record income, an expense, or a transfer between your own accounts.</DrawerDescription>
        </DrawerHeader>
        <Tabs
          value={kind}
          onValueChange={(value) => setKind(value as TransactionKind)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
            <TabsTrigger value="INCOME">Income</TabsTrigger>
            <TabsTrigger value="TRANSFER">Transfer</TabsTrigger>
          </TabsList>
          {/* Remounted per open/kind (key) so each tab/open starts from fresh field state. */}
          {kind === "TRANSFER" ? (
            <TransferForm
              key={`${String(open)}-${kind}`}
              accounts={accounts}
              defaultAccountId={defaultAccountId}
              onSuccess={() => setOpen(false)}
            />
          ) : (
            <IncomeOrExpenseForm
              key={`${String(open)}-${kind}`}
              kind={kind}
              accounts={accounts}
              categories={categories.filter((category) => category.type === kind)}
              defaultAccountId={defaultAccountId}
              onSuccess={() => setOpen(false)}
            />
          )}
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}

function IncomeOrExpenseForm({
  kind,
  accounts,
  categories,
  defaultAccountId,
  onSuccess,
}: {
  kind: "INCOME" | "EXPENSE";
  accounts: DialogAccount[];
  categories: DialogCategory[];
  defaultAccountId?: string;
  onSuccess: () => void;
}) {
  const defaultValues: RecordIncomeOrExpenseValues = {
    accountId: defaultAccountId ?? accounts[0]?.id ?? "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    vatAmount: undefined,
    transactionDate: today(),
    description: "",
  };
  const { gatedAction, reservation, wizardError, isPending, cancel, confirm } = useReservationGate(recordAction(kind));
  const form = useAppForm({
    defaultValues,
    // Cast: `z.coerce.date()` reports `transactionDate`'s input as `unknown`, not
    // the plain date string this form actually binds.
    schema: recordIncomeOrExpenseSchema as unknown as z.ZodType<unknown, RecordIncomeOrExpenseValues>,
    action: gatedAction,
    onSuccess: (state) => {
      if (state.success) onSuccess();
    },
  });
  const selectedAccountId = form.state.values.accountId;
  const currency = accounts.find((a) => a.id === selectedAccountId)?.currency ?? accounts[0]?.currency ?? "BDT";

  return (
    <>
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
                  {categories.map((category) => (
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
          {kind === "EXPENSE" && (
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
                    onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                  />
                  <FieldDescription>
                    Deducted from the account in addition to the amount above — it isn&apos;t included in the amount
                    itself.
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
                  max={today()}
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
                  onChange={(e) => field.handleChange(e.target.value)}
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
              {isSubmitting ? "Saving…" : kind === "INCOME" ? "Record income" : "Record expense"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
    {reservation && (
      <ReservationConsentWizard
        open
        shortfall={reservation.shortfall}
        currency={currency}
        goals={reservation.goals}
        pending={isPending}
        error={wizardError}
        onCancel={cancel}
        onConfirm={(consent) => confirm(consent, onSuccess)}
      />
    )}
    </>
  );
}

function TransferForm({
  accounts,
  defaultAccountId,
  onSuccess,
}: {
  accounts: DialogAccount[];
  defaultAccountId?: string;
  onSuccess: () => void;
}) {
  const defaultValues: RecordTransferValues = {
    sourceAccountId: defaultAccountId ?? accounts[0]?.id ?? "",
    destinationAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    amount: "",
    vatAmount: undefined,
    transactionDate: today(),
    description: "",
  };
  const { gatedAction, reservation, wizardError, isPending, cancel, confirm } = useReservationGate(
    recordAction("TRANSFER")
  );
  const form = useAppForm({
    defaultValues,
    // Cast: see the same cast in `IncomeOrExpenseForm` above.
    schema: recordTransferSchema as unknown as z.ZodType<unknown, RecordTransferValues>,
    action: gatedAction,
    onSuccess: (state) => {
      if (state.success) onSuccess();
    },
  });
  const selectedSourceAccountId = form.state.values.sourceAccountId;
  const currency = accounts.find((a) => a.id === selectedSourceAccountId)?.currency ?? accounts[0]?.currency ?? "BDT";

  return (
    <>
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
          <form.Field name="sourceAccountId">
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
          <form.Field name="destinationAccountId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>To account</FieldLabel>
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
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <FieldDescription>
                  Deducted from the from account in addition to the amount above — it isn&apos;t included in the
                  amount itself.
                </FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="transactionDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  max={today()}
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
                  onChange={(e) => field.handleChange(e.target.value)}
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
              {isSubmitting ? "Saving…" : "Record transfer"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
    {reservation && (
      <ReservationConsentWizard
        open
        shortfall={reservation.shortfall}
        currency={currency}
        goals={reservation.goals}
        pending={isPending}
        error={wizardError}
        onCancel={cancel}
        onConfirm={(consent) => confirm(consent, onSuccess)}
      />
    )}
    </>
  );
}
