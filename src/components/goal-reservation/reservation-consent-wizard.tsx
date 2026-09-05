"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney } from "@/components/transactions/transaction-format";

export interface ReservationGoalOption {
  goalId: string;
  goalName: string;
  /** How much this goal has reserved on this account — the cap on its typed share. */
  reserved: string;
}

export interface ReservationConsentResult {
  concent: true;
  allocations: { goalId: string; amount: string; returnBy?: string }[];
}

interface GoalSelection {
  checked: boolean;
  amount: string;
  returning: boolean;
  returnBy: string;
}

interface ReservationConsentWizardProps {
  open: boolean;
  shortfall: string;
  currency: string;
  goals: ReservationGoalOption[];
  pending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (consent: ReservationConsentResult) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialSelections(goals: ReservationGoalOption[]): Record<string, GoalSelection> {
  return Object.fromEntries(
    goals.map((goal) => [goal.goalId, { checked: false, amount: "", returning: false, returnBy: "" }])
  );
}

/**
 * The blocking two-step consent flow (goal-reservation-guard spec,
 * "Reservation Consent Wizard"): Step 1 gates on typing the literal word
 * CONCENT; Step 2 (only reachable from there) picks which goal(s) absorb the
 * shortfall and whether each is a permanent reduction or a promised return.
 * Nothing is confirmed until the caller's `onConfirm` actually submits — this
 * component itself never talks to the server.
 */
export function ReservationConsentWizard({
  open,
  shortfall,
  currency,
  goals,
  pending = false,
  error,
  onCancel,
  onConfirm,
}: ReservationConsentWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [concentText, setConcentText] = useState("");
  const [selections, setSelections] = useState<Record<string, GoalSelection>>(() => initialSelections(goals));

  function reset() {
    setStep(1);
    setConcentText("");
    setSelections(initialSelections(goals));
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function updateSelection(goalId: string, patch: Partial<GoalSelection>) {
    setSelections((prev) => ({ ...prev, [goalId]: { ...prev[goalId], ...patch } }));
  }

  const selectedEntries = Object.entries(selections).filter(([, sel]) => sel.checked);
  const typedSum = selectedEntries.reduce((sum, [, sel]) => sum + (Number(sel.amount) || 0), 0);
  const sumMatches = selectedEntries.length > 0 && Math.abs(typedSum - Number(shortfall)) < 0.005;
  const everyAmountValid = selectedEntries.every(([goalId, sel]) => {
    const goal = goals.find((g) => g.goalId === goalId);
    const amount = Number(sel.amount);
    return amount > 0 && goal !== undefined && amount <= Number(goal.reserved) + 0.005;
  });
  const everyReturnDateValid = selectedEntries.every(([, sel]) => !sel.returning || sel.returnBy !== "");
  const canConfirm = sumMatches && everyAmountValid && everyReturnDateValid && !pending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>This reduces reserved savings</DialogTitle>
              <DialogDescription>
                {formatMoney(shortfall, currency)} of this would come out of money a savings goal already has
                reserved on this account. Type <strong>CONCENT</strong> below to continue.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reservation-concent">Type CONCENT to continue</FieldLabel>
                <Input
                  id="reservation-concent"
                  autoFocus
                  value={concentText}
                  onChange={(e) => setConcentText(e.target.value)}
                  placeholder="CONCENT"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" disabled={concentText.trim() !== "CONCENT"} onClick={() => setStep(2)}>
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose which goal(s) absorb this</DialogTitle>
              <DialogDescription>
                Select the goal(s) this comes from and type an amount for each — they must add up to exactly{" "}
                {formatMoney(shortfall, currency)}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto">
              {goals.map((goal) => {
                const sel = selections[goal.goalId];
                return (
                  <div key={goal.goalId} className="rounded-lg border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={sel.checked}
                        onCheckedChange={(checked) => updateSelection(goal.goalId, { checked: checked === true })}
                      />
                      {goal.goalName}
                      <span className="font-normal text-muted-foreground">
                        ({formatMoney(goal.reserved, currency)} reserved)
                      </span>
                    </label>
                    {sel.checked && (
                      <div className="mt-3 flex flex-col gap-3 pl-6">
                        <Field>
                          <FieldLabel htmlFor={`amount-${goal.goalId}`}>Amount from this goal</FieldLabel>
                          <Input
                            id={`amount-${goal.goalId}`}
                            inputMode="decimal"
                            placeholder="0.00"
                            value={sel.amount}
                            onChange={(e) => updateSelection(goal.goalId, { amount: e.target.value })}
                          />
                        </Field>
                        <RadioGroup
                          value={sel.returning ? "returning" : "permanent"}
                          onValueChange={(value) => updateSelection(goal.goalId, { returning: value === "returning" })}
                          className="gap-2"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="permanent" />
                            This is a permanent reduction
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="returning" />
                            This will return to the goal by a date
                          </label>
                        </RadioGroup>
                        {sel.returning && (
                          <Field>
                            <FieldLabel htmlFor={`return-by-${goal.goalId}`}>Return by</FieldLabel>
                            <Input
                              id={`return-by-${goal.goalId}`}
                              type="date"
                              min={today()}
                              value={sel.returnBy}
                              onChange={(e) => updateSelection(goal.goalId, { returnBy: e.target.value })}
                            />
                            <FieldDescription>
                              This will show as a reminder banner on your dashboard until you return it or write it
                              off.
                            </FieldDescription>
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <p className={selectedEntries.length > 0 && !sumMatches ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                Selected so far: {formatMoney(typedSum.toFixed(2), currency)} of {formatMoney(shortfall, currency)}{" "}
                required.
              </p>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={pending}>
                Back
              </Button>
              <Button
                type="button"
                disabled={!canConfirm}
                onClick={() =>
                  onConfirm({
                    concent: true,
                    allocations: selectedEntries.map(([goalId, sel]) => ({
                      goalId,
                      amount: sel.amount,
                      returnBy: sel.returning ? sel.returnBy : undefined,
                    })),
                  })
                }
              >
                {pending ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
