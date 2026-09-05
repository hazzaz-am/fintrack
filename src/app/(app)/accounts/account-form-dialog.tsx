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
import { createAccountAction, updateAccountAction } from "./actions";
import { createAccountSchema, updateAccountSchema } from "@/lib/validation/account";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";

type CreateAccountValues = z.input<typeof createAccountSchema>;
type UpdateAccountValues = z.input<typeof updateAccountSchema>;

const ACCOUNT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "MOBILE_BANKING", label: "Mobile Banking" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
  { value: "OTHER", label: "Other" },
];

export interface EditableAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currency: string;
  description: string | null;
}

interface AccountFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  account?: EditableAccount;
}

export function AccountFormDialog({ trigger, triggerLabel, account }: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(account);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={trigger}>{triggerLabel}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit account" : "Add account"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update this account's details. Its balance is derived from transactions and can't be edited directly."
              : "Add a place where you keep money — a bank account, mobile wallet, or cash."}
          </DrawerDescription>
        </DrawerHeader>
        {/* Remounted on every open (key) so each open starts from fresh field state. */}
        {account ? (
          <EditAccountForm key={String(open)} account={account} onSuccess={() => setOpen(false)} />
        ) : (
          <CreateAccountForm key={String(open)} onSuccess={() => setOpen(false)} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CreateAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const defaultValues: CreateAccountValues = {
    name: "",
    type: "BANK_ACCOUNT",
    institution: undefined,
    openingBalance: "0.00",
    currency: "BDT",
    description: undefined,
  };
  const form = useAppForm({
    defaultValues,
    schema: createAccountSchema,
    action: createAccountAction,
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
          <form.Field name="type">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value as CreateAccountValues["type"])}
                >
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
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
          <form.Field name="openingBalance">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Opening balance</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  inputMode="decimal"
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldDescription>The balance this account starts with, before any transactions.</FieldDescription>
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="currency">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={3}
                  className="uppercase"
                  value={field.state.value ?? ""}
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
              {isSubmitting ? "Adding…" : "Add account"}
            </Button>
          )}
        </form.Subscribe>
      </DrawerFooter>
    </form>
  );
}

function EditAccountForm({ account, onSuccess }: { account: EditableAccount; onSuccess: () => void }) {
  const defaultValues: UpdateAccountValues = {
    name: account.name,
    type: account.type as UpdateAccountValues["type"],
    institution: account.institution,
    currency: account.currency,
    description: account.description,
  };
  const form = useAppForm({
    defaultValues,
    schema: updateAccountSchema,
    action: updateAccountAction.bind(null, account.id),
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
          <form.Field name="type">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ""}
                  onBlur={() => handleFieldBlur(field)}
                  onChange={(e) => field.handleChange(e.target.value as UpdateAccountValues["type"])}
                >
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
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
                  onChange={(e) => field.handleChange(e.target.value === "" ? null : e.target.value)}
                />
                <AppFieldError field={field} />
              </Field>
            )}
          </form.Field>
          <form.Field name="currency">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  maxLength={3}
                  className="uppercase"
                  value={field.state.value ?? ""}
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
