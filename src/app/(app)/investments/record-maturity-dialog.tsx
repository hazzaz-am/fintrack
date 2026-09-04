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
import { recordMaturityAction, type InvestmentActionState } from "./actions";
import type { DialogAccount } from "./investment-form-dialog";
import { formatMoney } from "@/components/transactions/transaction-format";

const initialState: InvestmentActionState = {};

type Outcome = "MATURED" | "WITHDRAWN";

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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Recording…" : "Record"}
    </Button>
  );
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
  const action = recordMaturityAction.bind(null, investmentId);
  const [state, formAction] = useActionState(action, initialState);
  const [outcome, setOutcome] = useState<Outcome>(defaultOutcome(maturityDate));
  const [principalAmount, setPrincipalAmount] = useState(availablePrincipal);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  const exceedsAvailable = Number(principalAmount || 0) > Number(availablePrincipal);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOutcome(defaultOutcome(maturityDate));
          setPrincipalAmount(availablePrincipal);
        }
      }}
    >
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Record maturity or withdrawal — {investmentName}</DrawerTitle>
          <DrawerDescription>
            Available principal: {formatMoney(availablePrincipal, currency)}
          </DrawerDescription>
        </DrawerHeader>
        <form key={String(open)} action={formAction} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <input type="hidden" name="newStatus" value={outcome} />
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="accountId">To account</FieldLabel>
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
              <FieldLabel htmlFor="principalAmount">Principal returned</FieldLabel>
              <Input
                id="principalAmount"
                name="principalAmount"
                inputMode="decimal"
                required
                value={principalAmount}
                onChange={(event) => setPrincipalAmount(event.target.value)}
              />
              {exceedsAvailable ? (
                <FieldError>
                  Only {formatMoney(availablePrincipal, currency)} of principal is available on this investment.
                </FieldError>
              ) : (
                <FieldError errors={state.fieldErrors?.principalAmount?.map((message) => ({ message }))} />
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="profitAmount">Profit (optional)</FieldLabel>
              <Input id="profitAmount" name="profitAmount" inputMode="decimal" placeholder="0.00" />
              <FieldDescription>Recorded as a separate Income → Investment Return transaction.</FieldDescription>
              <FieldError errors={state.fieldErrors?.profitAmount?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
              <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={today()} />
              <FieldError errors={state.fieldErrors?.transactionDate?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel>Outcome</FieldLabel>
              <Tabs value={outcome} onValueChange={(value) => setOutcome(value as Outcome)}>
                <TabsList>
                  <TabsTrigger value="MATURED">Matured</TabsTrigger>
                  <TabsTrigger value="WITHDRAWN">Withdrawn early</TabsTrigger>
                </TabsList>
              </Tabs>
              <FieldDescription>This closes the investment — it can no longer receive contributions afterward.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={300} />
              <FieldError errors={state.fieldErrors?.description?.map((message) => ({ message }))} />
            </Field>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          </div>
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="outline" />}>Cancel</DrawerClose>
            <SubmitButton disabled={exceedsAvailable} />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
