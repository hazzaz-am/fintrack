"use client";

import { useState } from "react";
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
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validation/category";
import { createCategoryAction, updateCategoryAction } from "./actions";

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

export function CategoryFormDialog({ trigger, triggerLabel, category, defaultType }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(category);

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
        {/* Remounted on every open/close (key) so each open starts from fresh field state. */}
        {category ? (
          <EditCategoryForm key={String(open)} category={category} onSuccess={() => setOpen(false)} />
        ) : (
          <CreateCategoryForm key={String(open)} defaultType={defaultType} onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateCategoryForm({
  defaultType,
  onSuccess,
}: {
  defaultType?: "INCOME" | "EXPENSE";
  onSuccess: () => void;
}) {
  const defaultValues: CreateCategoryInput = { name: "", type: defaultType ?? "EXPENSE" };
  const form = useAppForm({
    defaultValues,
    schema: createCategorySchema,
    action: createCategoryAction,
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                maxLength={80}
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
                onChange={(e) => field.handleChange(e.target.value as "INCOME" | "EXPENSE")}
              >
                <NativeSelectOption value="INCOME">Income</NativeSelectOption>
                <NativeSelectOption value="EXPENSE">Expense</NativeSelectOption>
              </NativeSelect>
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(formError) =>
            formError ? (
              <FieldError>
                <p role="alert" className="text-sm font-normal text-destructive">
                  {String(formError)}
                </p>
              </FieldError>
            ) : null
          }
        </form.Subscribe>
      </FieldGroup>
      <DialogFooter className="mt-5">
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Adding…" : "Add category"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function EditCategoryForm({
  category,
  onSuccess,
}: {
  category: EditableCategory;
  onSuccess: () => void;
}) {
  const defaultValues: UpdateCategoryInput = { name: category.name };
  const form = useAppForm({
    defaultValues,
    schema: updateCategorySchema,
    action: updateCategoryAction.bind(null, category.id),
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                maxLength={80}
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(formError) =>
            formError ? (
              <FieldError>
                <p role="alert" className="text-sm font-normal text-destructive">
                  {String(formError)}
                </p>
              </FieldError>
            ) : null
          }
        </form.Subscribe>
      </FieldGroup>
      <DialogFooter className="mt-5">
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
