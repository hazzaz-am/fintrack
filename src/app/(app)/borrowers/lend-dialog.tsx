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
import { disburseLoanAction } from "./actions";
import { disburseLoanSchema } from "@/lib/validation/borrower";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { useReservationGate } from "@/lib/forms/use-reservation-gate";
import { ReservationConsentWizard } from "@/components/goal-reservation/reservation-consent-wizard";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { formatMoney } from "@/components/transactions/transaction-format";

export interface LendAccountOption {
  id: string;
  name: string;
  currency: string;
  /** Computed balance minus what's allocated to savings goals on this account (goal-reservation-guard's unallocated-balance math) — a loan can never exceed this. */
  unallocated: string;
}

type DisburseLoanValues = Omit<z.input<typeof disburseLoanSchema>, "disbursedDate" | "dueDate"> & {
  disbursedDate: string;
  dueDate: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// A due date defaulting to today would read as overdue the instant the loan
// is created (isOverdue fires once `dueDate` has passed, and "today" is
// already in the past relative to any later moment the same day) — default
// two weeks out instead, editable either way.
function twoWeeksFromToday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function LendDialog({
  trigger,
  triggerLabel,
  borrowerId,
  borrowerName,
  accounts,
}: {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  borrowerId: string;
  borrowerName: string;
  accounts: LendAccountOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Lend to {borrowerName}</DrawerTitle>
          <DrawerDescription>
            Lending more than an account&apos;s unallocated balance is allowed, but dipping into money a savings goal
            already has reserved requires confirming which goal(s) it comes from.
          </DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <LendForm key={String(open)} borrowerId={borrowerId} accounts={accounts} onSuccess={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

function LendForm({
  borrowerId,
  accounts,
  onSuccess,
}: {
  borrowerId: string;
  accounts: LendAccountOption[];
  onSuccess: () => void;
}) {
  const defaultValues: DisburseLoanValues = {
    borrowerId,
    accountId: accounts[0]?.id ?? "",
    amount: "",
    disbursedDate: today(),
    dueDate: twoWeeksFromToday(),
    description: undefined,
  };

  const { gatedAction, reservation, wizardError, isPending, cancel, confirm } = useReservationGate(
    disburseLoanAction.bind(null, borrowerId)
  );
  const form = useAppForm({
    defaultValues,
    schema: disburseLoanSchema as unknown as z.ZodType<unknown, DisburseLoanValues>,
    action: gatedAction,
    onSuccess: (state) => {
      if (state.success) onSuccess();
    },
  });
  const selectedAccountId = form.state.values.accountId;
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const currency = selectedAccount?.currency ?? accounts[0]?.currency ?? "BDT";

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
                {selectedAccount && (
                  <FieldDescription>
                    {formatMoney(selectedAccount.unallocated, selectedAccount.currency)} unallocated
                  </FieldDescription>
                )}
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
          <form.Field name="disbursedDate">
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
          <form.Field name="dueDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Due date</FieldLabel>
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
              {isSubmitting ? "Lending…" : "Lend"}
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
