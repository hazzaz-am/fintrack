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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { recordRepaymentAction } from "./actions";
import { recordRepaymentSchema } from "@/lib/validation/borrower";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { formatMoney } from "@/components/transactions/transaction-format";

export interface RepayAccountOption {
  id: string;
  name: string;
  currency: string;
}

type RecordRepaymentValues = Omit<z.input<typeof recordRepaymentSchema>, "transactionDate"> & {
  transactionDate: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RepayDialog({
  trigger,
  triggerLabel,
  loanId,
  borrowerName,
  outstanding,
  currency,
  accounts,
}: {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  loanId: string;
  borrowerName: string;
  outstanding: string;
  currency: string;
  accounts: RepayAccountOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Record repayment from {borrowerName}</DrawerTitle>
          <DrawerDescription>{formatMoney(outstanding, currency)} currently outstanding on this loan.</DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <RepayForm
          key={String(open)}
          loanId={loanId}
          outstanding={outstanding}
          currency={currency}
          accounts={accounts}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function RepayForm({
  loanId,
  outstanding,
  currency,
  accounts,
  onSuccess,
}: {
  loanId: string;
  outstanding: string;
  currency: string;
  accounts: RepayAccountOption[];
  onSuccess: () => void;
}) {
  const defaultValues: RecordRepaymentValues = {
    loanId,
    accountId: accounts[0]?.id ?? "",
    amount: outstanding,
    transactionDate: today(),
    description: undefined,
  };

  // `outstanding` is a per-loan runtime value the shared schema can't
  // hardcode, so the guard is added as an instance-level refine — same
  // pattern as record-maturity-dialog's available-principal guard.
  const schema = recordRepaymentSchema.refine((data) => Number(data.amount) <= Number(outstanding), {
    message: `Only ${formatMoney(outstanding, currency)} remains outstanding on this loan.`,
    path: ["amount"],
  });

  const form = useAppForm({
    defaultValues,
    schema: schema as unknown as z.ZodType<unknown, RecordRepaymentValues>,
    action: recordRepaymentAction.bind(null, loanId),
    onSuccess: (state) => {
      if (state.success) onSuccess();
    },
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
          <form.Field name="accountId">
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
              {isSubmitting ? "Recording…" : "Record repayment"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}
