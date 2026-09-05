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
import { moveAllocationAction } from "./actions";
import { moveAllocationSchema } from "@/lib/validation/savings-goal";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

// `fromGoalId` isn't a rendered field - it's a fixed value matching the prop,
// included only so the shared schema (which requires it) validates.
type MoveAllocationValues = z.input<typeof moveAllocationSchema>;

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

export function MoveAllocationDialog({
  trigger,
  triggerLabel,
  fromGoalId,
  fromGoalName,
  otherGoals,
  accounts,
}: MoveAllocationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move allocation from {fromGoalName}</DrawerTitle>
          <DrawerDescription>Move money already allocated to this goal into another goal.</DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        <MoveAllocationForm
          key={String(open)}
          fromGoalId={fromGoalId}
          otherGoals={otherGoals}
          accounts={accounts}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

function MoveAllocationForm({
  fromGoalId,
  otherGoals,
  accounts,
  onSuccess,
}: {
  fromGoalId: string;
  otherGoals: { id: string; name: string }[];
  accounts: SourceAccount[];
  onSuccess: () => void;
}) {
  const defaultValues: MoveAllocationValues = {
    fromGoalId,
    toGoalId: otherGoals[0]?.id ?? "",
    accountId: accounts[0]?.id ?? "",
    amount: "",
    note: undefined,
  };
  // Client-only guard capping the move amount at what the *selected* account has
  // allocated to this goal (design.md D5 / Decision 3) - dynamic per account, so
  // it's an instance-level refine rather than something the shared schema can encode.
  const schema = moveAllocationSchema.superRefine((data, ctx) => {
    const account = accounts.find((a) => a.id === data.accountId);
    if (account && Number(data.amount) > Number(account.allocated)) {
      ctx.addIssue({
        code: "custom",
        message: `Only ${account.allocated} is allocated to this goal from this account.`,
        path: ["amount"],
      });
    }
  });

  const form = useAppForm({
    defaultValues,
    schema: schema as unknown as z.ZodType<unknown, MoveAllocationValues>,
    action: moveAllocationAction.bind(null, fromGoalId),
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
                <FieldLabel htmlFor={field.name}>From account</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    void form.validateField("amount", "change");
                  }}
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
          <form.Field name="toGoalId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>To goal</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {otherGoals.map((goal) => (
                    <NativeSelectOption key={goal.id} value={goal.id}>
                      {goal.name}
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
          <form.Field name="note">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Note</FieldLabel>
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
            <Button type="submit" disabled={!canSubmit || otherGoals.length === 0}>
              {isSubmitting ? "Moving…" : "Move"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}
