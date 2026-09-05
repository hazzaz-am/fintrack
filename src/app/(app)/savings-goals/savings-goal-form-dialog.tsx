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
import { createGoalAction, updateGoalAction } from "./actions";
import { createSavingsGoalSchema, updateSavingsGoalSchema } from "@/lib/validation/savings-goal";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

// `z.coerce.date()`'s input type is intentionally `unknown` - override
// `targetDate` back to the plain date string these forms bind to.
type CreateSavingsGoalValues = Omit<z.input<typeof createSavingsGoalSchema>, "targetDate"> & {
  targetDate: string | undefined;
};
type UpdateSavingsGoalValues = Omit<z.input<typeof updateSavingsGoalSchema>, "targetDate"> & {
  targetDate: string | null;
};

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

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function SavingsGoalFormDialog({ trigger, triggerLabel, goal }: SavingsGoalFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(goal);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit goal" : "New savings goal"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update this goal's name, target, or target date. It won't affect money already allocated to it."
              : "Set a target for something you're saving for. Fund it from your accounts afterward."}
          </DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        {goal ? (
          <EditGoalForm key={String(open)} goal={goal} onSuccess={() => setOpen(false)} />
        ) : (
          <CreateGoalForm key={String(open)} onSuccess={() => setOpen(false)} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CreateGoalForm({ onSuccess }: { onSuccess: () => void }) {
  const defaultValues: CreateSavingsGoalValues = {
    name: "",
    targetAmount: "",
    targetDate: undefined,
    description: undefined,
  };
  const form = useAppForm({
    defaultValues,
    schema: createSavingsGoalSchema as unknown as z.ZodType<unknown, CreateSavingsGoalValues>,
    action: createGoalAction,
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
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="targetAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Target amount</FieldLabel>
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
          <form.Field name="targetDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Target date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? undefined : e.target.value)}
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
              {isSubmitting ? "Creating…" : "Create goal"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}

function EditGoalForm({ goal, onSuccess }: { goal: EditableSavingsGoal; onSuccess: () => void }) {
  const defaultValues: UpdateSavingsGoalValues = {
    name: goal.name,
    targetAmount: goal.targetAmount,
    targetDate: toDateInputValue(goal.targetDate) || null,
    description: goal.description,
  };
  const form = useAppForm({
    defaultValues,
    schema: updateSavingsGoalSchema as unknown as z.ZodType<unknown, UpdateSavingsGoalValues>,
    action: updateGoalAction.bind(null, goal.id),
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
          <form.Field name="targetAmount">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Target amount</FieldLabel>
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
          <form.Field name="targetDate">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Target date</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="date"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
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
