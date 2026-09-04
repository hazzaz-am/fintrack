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
import { createInvestmentAction, updateInvestmentAction, type InvestmentActionState } from "./actions";
import { INVESTMENT_TYPE_LABELS } from "./investment-type-labels";

const initialState: InvestmentActionState = {};

type FundingMode = "fund" | "owned" | "skip";

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

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
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

export function InvestmentFormDialog({ trigger, triggerLabel, accounts, investment }: InvestmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(investment);
  const action = investment ? updateInvestmentAction.bind(null, investment.id) : createInvestmentAction;
  const [state, formAction] = useActionState(action, initialState);
  const [fundingMode, setFundingMode] = useState<FundingMode>("fund");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFundingMode("fund");
      }}
    >
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
        {/* Keyed on open+fundingMode so each open/mode is a fresh, uncontrolled mount (same rationale as AccountFormDialog / RecordTransactionDialog). */}
        <form
          key={`${String(open)}-${isEdit ? "edit" : fundingMode}`}
          action={formAction}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {!isEdit && <input type="hidden" name="fundingMode" value={fundingMode} />}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required maxLength={120} defaultValue={investment?.name} />
              <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
            </Field>

            {isEdit ? (
              <FieldDescription>
                Type: {INVESTMENT_TYPE_LABELS[investment!.type] ?? investment!.type} · Started{" "}
                {toDateInputValue(investment!.startDate)}
              </FieldDescription>
            ) : (
              <Field>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <NativeSelect id="type" name="type" defaultValue="FDR">
                  {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={state.fieldErrors?.type?.map((message) => ({ message }))} />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="institution">Institution</FieldLabel>
              <Input
                id="institution"
                name="institution"
                maxLength={120}
                defaultValue={investment?.institution ?? ""}
              />
              <FieldError errors={state.fieldErrors?.institution?.map((message) => ({ message }))} />
            </Field>

            {!isEdit && (
              <Field>
                <FieldLabel htmlFor="startDate">Start date</FieldLabel>
                <Input id="startDate" name="startDate" type="date" required defaultValue={today()} />
                <FieldError errors={state.fieldErrors?.startDate?.map((message) => ({ message }))} />
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="maturityDate">Maturity date</FieldLabel>
              <Input
                id="maturityDate"
                name="maturityDate"
                type="date"
                defaultValue={toDateInputValue(investment?.maturityDate)}
              />
              <FieldDescription>Leave blank for an investment with no fixed maturity (e.g. stocks).</FieldDescription>
              <FieldError errors={state.fieldErrors?.maturityDate?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="expectedReturnAmount">Expected return</FieldLabel>
              <Input
                id="expectedReturnAmount"
                name="expectedReturnAmount"
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={investment?.expectedReturnAmount ?? ""}
              />
              <FieldError errors={state.fieldErrors?.expectedReturnAmount?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="expectedReturnRate">Expected return rate (%)</FieldLabel>
              <Input
                id="expectedReturnRate"
                name="expectedReturnRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={investment?.expectedReturnRate ?? ""}
              />
              <FieldError errors={state.fieldErrors?.expectedReturnRate?.map((message) => ({ message }))} />
            </Field>

            <Field>
              <FieldLabel htmlFor="currentValue">Current estimated value</FieldLabel>
              <Input
                id="currentValue"
                name="currentValue"
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={investment?.currentValue ?? ""}
              />
              <FieldDescription>For market-based instruments (stocks, crypto) — overwritten each time you update it.</FieldDescription>
              <FieldError errors={state.fieldErrors?.currentValue?.map((message) => ({ message }))} />
            </Field>

            {!isEdit && (
              <>
                <Field>
                  <FieldLabel>How are you funding this?</FieldLabel>
                  <Tabs value={fundingMode} onValueChange={(value) => setFundingMode(value as FundingMode)}>
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
                    <Field>
                      <FieldLabel htmlFor="accountId">From account</FieldLabel>
                      <NativeSelect id="accountId" name="accountId" defaultValue={accounts[0]?.id}>
                        {accounts.map((account) => (
                          <NativeSelectOption key={account.id} value={account.id}>
                            {account.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldError errors={state.fieldErrors?.accountId?.map((message) => ({ message }))} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contributionAmount">Contribution amount</FieldLabel>
                      <Input id="contributionAmount" name="contributionAmount" inputMode="decimal" required placeholder="0.00" />
                      <FieldError errors={state.fieldErrors?.contributionAmount?.map((message) => ({ message }))} />
                    </Field>
                  </>
                )}

                {fundingMode === "owned" && (
                  <Field>
                    <FieldLabel htmlFor="openingPrincipal">Opening principal</FieldLabel>
                    <Input id="openingPrincipal" name="openingPrincipal" inputMode="decimal" required placeholder="0.00" />
                    <FieldError errors={state.fieldErrors?.openingPrincipal?.map((message) => ({ message }))} />
                  </Field>
                )}
              </>
            )}

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Input id="notes" name="notes" maxLength={500} defaultValue={investment?.notes ?? ""} />
              <FieldError errors={state.fieldErrors?.notes?.map((message) => ({ message }))} />
            </Field>

            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          </div>
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
            <SubmitButton
              label={isEdit ? "Save changes" : "Create investment"}
              pendingLabel={isEdit ? "Saving…" : "Creating…"}
            />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
