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
import { createGoalAction, updateGoalAction, type SavingsGoalActionState } from "./actions";

const initialState: SavingsGoalActionState = {};

export interface DialogAccount {
  id: string;
  name: string;
  currency: string;
}

export interface EditableSavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  targetDate: Date | string | null;
  description: string | null;
}

interface SavingsGoalFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  goal?: EditableSavingsGoal;
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

export function SavingsGoalFormDialog({ trigger, triggerLabel, goal }: SavingsGoalFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(goal);
  const action = goal ? updateGoalAction.bind(null, goal.id) : createGoalAction;
  const [state, formAction] = useActionState(action, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this goal's name, target, or target date. It won't affect money already allocated to it."
              : "Set a target for something you're saving for. Fund it from your accounts afterward."}
          </DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required maxLength={120} defaultValue={goal?.name} />
              <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="targetAmount">Target amount</FieldLabel>
              <Input
                id="targetAmount"
                name="targetAmount"
                inputMode="decimal"
                required
                placeholder="0.00"
                defaultValue={goal?.targetAmount}
              />
              <FieldError errors={state.fieldErrors?.targetAmount?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="targetDate">Target date</FieldLabel>
              <Input id="targetDate" name="targetDate" type="date" defaultValue={toDateInputValue(goal?.targetDate)} />
              <FieldError errors={state.fieldErrors?.targetDate?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" maxLength={500} defaultValue={goal?.description ?? ""} />
              <FieldError errors={state.fieldErrors?.description?.map((message) => ({ message }))} />
            </Field>
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <SubmitButton label={isEdit ? "Save changes" : "Create goal"} pendingLabel={isEdit ? "Saving…" : "Creating…"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
