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
import { createInvestmentAction, updateInvestmentAction, type InvestmentActionState } from "./actions";
import { createInvestmentWithContributionSchema, updateInvestmentSchema } from "@/lib/validation/investment";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { useReservationGate } from "@/lib/forms/use-reservation-gate";
import { ReservationConsentWizard } from "@/components/goal-reservation/reservation-consent-wizard";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { INVESTMENT_TYPE_LABELS } from "./investment-type-labels";

type FundingMode = "fund" | "owned" | "skip";

// `z.input<...>` reports a `z.coerce.*` field's input as `unknown` - override
// those back to the plain strings these forms actually bind.
type CreateInvestmentValues = Omit<
  z.input<typeof createInvestmentWithContributionSchema>,
  "startDate" | "maturityDate" | "expectedReturnRate"
> & {
  startDate: string;
  maturityDate: string | undefined;
  expectedReturnRate: string | undefined;
};
type EditInvestmentValues = Omit<z.input<typeof updateInvestmentSchema>, "maturityDate" | "expectedReturnRate"> & {
  maturityDate: string | null;
  expectedReturnRate: string | null;
};

export interface DialogAccount {
  id: string;
  name: string;
  currency: string;
}

export interface EditableInvestment {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  startDate: Date | string;
  maturityDate: Date | string | null;
  expectedReturnAmount: string | null;
  expectedReturnRate: string | null;
  currentValue: string | null;
  notes: string | null;
}

interface InvestmentFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  accounts: DialogAccount[];
  investment?: EditableInvestment;
}

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bakes the given `fundingMode` into `createInvestmentAction`'s FormData, matching the hidden field the action already dispatches on. */
function createAction(fundingMode: FundingMode) {
  return (prevState: InvestmentActionState, formData: FormData) => {
    formData.set("fundingMode", fundingMode);
    return createInvestmentAction(prevState, formData);
  };
}

export function InvestmentFormDialog({ trigger, triggerLabel, accounts, investment }: InvestmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(investment);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit investment" : "New investment"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update this investment's details. Its type, start date, and principal aren't editable here — record a contribution or maturity/withdrawal to change principal."
              : "Record an FDR, DPS, stocks, or any other investment you're tracking."}
          </DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        {investment ? (
          <EditInvestmentForm key={String(open)} investment={investment} onSuccess={() => setOpen(false)} />
        ) : (
          <CreateInvestmentForm key={String(open)} accounts={accounts} onSuccess={() => setOpen(false)} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CreateInvestmentForm({ accounts, onSuccess }: { accounts: DialogAccount[]; onSuccess: () => void }) {
  const [fundingMode, setFundingMode] = useState<FundingMode>("fund");

  const defaultValues: CreateInvestmentValues = {
    name: "",
    type: "FDR",
    institution: undefined,
    openingPrincipal: "0.00",
    startDate: today(),
    maturityDate: undefined,
    expectedReturnAmount: undefined,
    expectedReturnRate: undefined,
    currentValue: undefined,
    notes: undefined,
    accountId: accounts[0]?.id,
    contributionAmount: undefined,
  };
  const { gatedAction, reservation, wizardError, isPending, cancel, confirm } = useReservationGate(
    createAction(fundingMode)
  );
  const form = useAppForm({
    defaultValues,
    schema: createInvestmentWithContributionSchema as unknown as z.ZodType<unknown, CreateInvestmentValues>,
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
          <form.Field name="type">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value as CreateInvestmentValues["type"])}
                >
                  {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="institution">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Institution</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={120}
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
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
                  max={today()}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="maturityDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Maturity date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <FieldDescription>Leave blank for an investment with no fixed maturity (e.g. stocks).</FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="expectedReturnAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Expected return</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="expectedReturnRate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Expected return rate (%)</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="currentValue">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Current estimated value</FieldLabel>
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
                  For market-based instruments (stocks, crypto) — overwritten each time you update it.
                </FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>

          <Field>
            <FieldLabel>How are you funding this?</FieldLabel>
            <Tabs
              value={fundingMode}
              onValueChange={(value) => {
                const mode = value as FundingMode;
                setFundingMode(mode);
                // accountId/contributionAmount must be both-or-neither present
                // (the schema's cross-field refine) - clear both when they're
                // not the active mode's fields, so a leftover default from
                // "fund" mode doesn't silently fail that refine in another tab.
                form.setFieldValue("accountId", mode === "fund" ? accounts[0]?.id : undefined);
                form.setFieldValue("contributionAmount", undefined);
              }}
            >
              <TabsList>
                <TabsTrigger value="fund">Fund it now</TabsTrigger>
                <TabsTrigger value="owned">I already own this</TabsTrigger>
                <TabsTrigger value="skip">Skip for now</TabsTrigger>
              </TabsList>
            </Tabs>
            <FieldDescription>
              {fundingMode === "fund" && "Records a contribution from one of your accounts and starts this investment as Active."}
              {fundingMode === "owned" && "For an asset you already hold with no funding transaction to record (e.g. real estate)."}
              {fundingMode === "skip" && "Saves this investment as Planned, with zero principal, until you fund it."}
            </FieldDescription>
          </Field>

          {fundingMode === "fund" && (
            <>
              <form.Field name="accountId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>From account</FieldLabel>
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
              <form.Field name="contributionAmount">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Contribution amount</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={field.state.value ?? ""}
                      onBlur={() => handleFieldBlur(field)}
                      onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
                    />
                    <AppFieldError field={field} />
                  </Field>
                )}
              </form.Field>
            </>
          )}

          {fundingMode === "owned" && (
            <form.Field name="openingPrincipal">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Opening principal</FieldLabel>
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
          )}

          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={500}
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
              {isSubmitting ? "Creating…" : "Create investment"}
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

function EditInvestmentForm({
  investment,
  onSuccess,
}: {
  investment: EditableInvestment;
  onSuccess: () => void;
}) {
  const defaultValues: EditInvestmentValues = {
    name: investment.name,
    institution: investment.institution,
    maturityDate: toDateInputValue(investment.maturityDate) || null,
    expectedReturnAmount: investment.expectedReturnAmount,
    expectedReturnRate: investment.expectedReturnRate,
    currentValue: investment.currentValue,
    notes: investment.notes,
  };
  const form = useAppForm({
    defaultValues,
    schema: updateInvestmentSchema as unknown as z.ZodType<unknown, EditInvestmentValues>,
    action: updateInvestmentAction.bind(null, investment.id),
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

          <FieldDescription>
            Type: {INVESTMENT_TYPE_LABELS[investment.type] ?? investment.type} · Started{" "}
            {toDateInputValue(investment.startDate)}
          </FieldDescription>

          <form.Field name="institution">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Institution</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={120}
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="maturityDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Maturity date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <FieldDescription>Leave blank for an investment with no fixed maturity (e.g. stocks).</FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="expectedReturnAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Expected return</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="expectedReturnRate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Expected return rate (%)</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="currentValue">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Current estimated value</FieldLabel>
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
                  For market-based instruments (stocks, crypto) — overwritten each time you update it.
                </FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={500}
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
