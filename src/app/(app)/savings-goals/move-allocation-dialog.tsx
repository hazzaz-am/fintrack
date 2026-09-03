"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { moveAllocationAction, type SavingsGoalActionState } from "./actions";

const initialState: SavingsGoalActionState = {};

interface SourceAccount {
  id: string;
  name: string;
  /** How much this account currently has allocated to the source goal — the client-side cap on the move amount (design.md D5). */
  allocated: string;
}

interface MoveAllocationDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  fromGoalId: string;
  fromGoalName: string;
  otherGoals: { id: string; name: string }[];
  accounts: SourceAccount[];
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Moving…" : "Move"}
    </Button>
  );
}

export function MoveAllocationDialog({
  trigger,
  triggerLabel,
  fromGoalId,
  fromGoalName,
  otherGoals,
  accounts,
}: MoveAllocationDialogProps) {
  const [open, setOpen] = useState(false);
  const action = moveAllocationAction.bind(null, fromGoalId);
  const [state, formAction] = useActionState(action, initialState);
  const [accountId, setAccountId] = useState(accounts[0]?.id);
  const [amount, setAmount] = useState("");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const exceedsAvailable = selectedAccount ? Number(amount || 0) > Number(selectedAccount.allocated) : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAccountId(accounts[0]?.id);
          setAmount("");
        }
      }}
    >
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move allocation from {fromGoalName}</DialogTitle>
          <DialogDescription>Move money already allocated to this goal into another goal.</DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="accountId">From account</FieldLabel>
              <NativeSelect
                id="accountId"
                name="accountId"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <NativeSelectOption key={account.id} value={account.id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.accountId?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="toGoalId">To goal</FieldLabel>
              <NativeSelect id="toGoalId" name="toGoalId" defaultValue={otherGoals[0]?.id}>
                {otherGoals.map((goal) => (
                  <NativeSelectOption key={goal.id} value={goal.id}>
                    {goal.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={state.fieldErrors?.toGoalId?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {exceedsAvailable && selectedAccount ? (
                <FieldError>Only {selectedAccount.allocated} is allocated to this goal from this account.</FieldError>
              ) : (
                <FieldError errors={state.fieldErrors?.amount?.map((message) => ({ message }))} />
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="note">Note</FieldLabel>
              <Input id="note" name="note" maxLength={300} />
              <FieldError errors={state.fieldErrors?.note?.map((message) => ({ message }))} />
            </Field>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <SubmitButton disabled={exceedsAvailable || !otherGoals.length} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
