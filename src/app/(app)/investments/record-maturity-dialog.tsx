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
import { recordMaturityAction } from "./actions";
import { recordMaturityOrWithdrawalSchema } from "@/lib/validation/investment";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import type { DialogAccount } from "./investment-form-dialog";
import { formatMoney } from "@/components/transactions/transaction-format";

type Outcome = "MATURED" | "WITHDRAWN";

// `investmentId`/`newStatus` aren't directly-rendered fields (newStatus is driven by
// the Outcome tabs below). `z.input<...>` reports `transactionDate` as `unknown`
// because `z.coerce.date()`'s input type is intentionally unknown - override it.
type RecordMaturityValues = Omit<z.input<typeof recordMaturityOrWithdrawalSchema>, "transactionDate"> & {
  transactionDate: string;
};

interface RecordMaturityDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  investmentId: string;
  investmentName: string;
  accounts: DialogAccount[];
  availablePrincipal: string;
  currency: string;
  maturityDate: Date | string | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultOutcome(maturityDate: Date | string | null): Outcome {
  if (!maturityDate) return "WITHDRAWN";
  const target = typeof maturityDate === "string" ? new Date(maturityDate) : maturityDate;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return now.getTime() >= target.getTime() ? "MATURED" : "WITHDRAWN";
}

export function RecordMaturityDialog({
  trigger,
  triggerLabel,
  investmentId,
  investmentName,
  accounts,
  availablePrincipal,
  currency,
  maturityDate,
}: RecordMaturityDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Record maturity or withdrawal — {investmentName}</DrawerTitle>
          <DrawerDescription>Available principal: {formatMoney(availablePrincipal, currency)}</DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <RecordMaturityForm
          key={String(open)}
          investmentId={investmentId}
          accounts={accounts}
          availablePrincipal={availablePrincipal}
          currency={currency}
          maturityDate={maturityDate}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function RecordMaturityForm({
  investmentId,
  accounts,
  availablePrincipal,
  currency,
  maturityDate,
  onSuccess,
}: {
  investmentId: string;
  accounts: DialogAccount[];
  availablePrincipal: string;
  currency: string;
  maturityDate: Date | string | null;
  onSuccess: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>(defaultOutcome(maturityDate));

  const defaultValues: RecordMaturityValues = {
    investmentId,
    accountId: accounts[0]?.id ?? "",
    principalAmount: availablePrincipal,
    profitAmount: undefined,
    transactionDate: today(),
    newStatus: outcome,
    description: undefined,
  };
  // Client-only guard against exceeding available principal (design.md Decision 3)
  // - `availablePrincipal` is a per-investment runtime value the shared schema
  // can't hardcode, so it's added as an instance-level refine on top of it.
  const schema = recordMaturityOrWithdrawalSchema.refine(
    (data) => Number(data.principalAmount) <= Number(availablePrincipal),
    {
      message: `Only ${formatMoney(availablePrincipal, currency)} of principal is available on this investment.`,
      path: ["principalAmount"],
    }
  );
  const form = useAppForm({
    defaultValues,
    schema: schema as unknown as z.ZodType<unknown, RecordMaturityValues>,
    action: recordMaturityAction.bind(null, investmentId),
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
          <form.Field name="principalAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Principal returned</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  inputMode="decimal"
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="profitAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Profit (optional)</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <FieldDescription>Recorded as a separate Income → Investment Return transaction.</FieldDescription>
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
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <Field>
            <FieldLabel>Outcome</FieldLabel>
            <Tabs
              value={outcome}
              onValueChange={(value) => {
                const next = value as Outcome;
                setOutcome(next);
                form.setFieldValue("newStatus", next);
              }}
            >
              <TabsList>
                <TabsTrigger value="MATURED">Matured</TabsTrigger>
                <TabsTrigger value="WITHDRAWN">Withdrawn early</TabsTrigger>
              </TabsList>
            </Tabs>
            <FieldDescription>This closes the investment — it can no longer receive contributions afterward.</FieldDescription>
          </Field>
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
              {isSubmitting ? "Recording…" : "Record"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}
