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
import { createCategoryAction, updateCategoryAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = {};

export interface EditableCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
}

interface CategoryFormDialogProps {
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  category?: EditableCategory;
  /** Only used to pre-select the type on create, when opened from an Income or Expense section. */
  defaultType?: "INCOME" | "EXPENSE";
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function CategoryFormDialog({ trigger, triggerLabel, category, defaultType }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(category);
  const action = category ? updateCategoryAction.bind(null, category.id) : createCategoryAction;
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
          <DialogTitle>{isEdit ? "Rename category" : "New category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this category's name. It stays linked to every transaction that already uses it."
              : "Add a category to use when recording income or expenses."}
          </DialogDescription>
        </DialogHeader>
        <form key={String(open)} action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" required maxLength={80} defaultValue={category?.name} />
              <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
            </Field>
            {!isEdit && (
              <Field>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <NativeSelect id="type" name="type" defaultValue={defaultType ?? "EXPENSE"}>
                  <NativeSelectOption value="INCOME">Income</NativeSelectOption>
                  <NativeSelectOption value="EXPENSE">Expense</NativeSelectOption>
                </NativeSelect>
                <FieldError errors={state.fieldErrors?.type?.map((message) => ({ message }))} />
              </Field>
            )}
            {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <SubmitButton
              label={isEdit ? "Save changes" : "Add category"}
              pendingLabel={isEdit ? "Saving…" : "Adding…"}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
