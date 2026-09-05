"use client";

import { useForm, type AnyFieldApi } from "@tanstack/react-form";
import type { z } from "zod";

/** Every Server Action in this app returns this shape (see e.g. `SettingsActionState`, `TransactionActionState`). */
export interface AppActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

export type AppFormAction<TState extends AppActionState> = (
  prevState: TState,
  formData: FormData
) => Promise<TState>;

// Every present key is sent, `undefined`/`null` as "" - matching a native form
// submission, where a named input is always present even when empty. A key the
// form doesn't render at all (e.g. an edit form that omits a field for a
// transaction type it doesn't apply to) is simply absent, same as today.
// Server actions already normalize "" back to `undefined`/`null` per field
// (see `orUndefined`/`orNull` in each `actions.ts`), so this matches their
// existing "cleared" vs. "unchanged" semantics.
function valuesToFormData(values: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value === undefined || value === null ? "" : String(value));
  }
  return formData;
}

interface UseAppFormOptions<
  TValues extends Record<string, unknown>,
  TState extends AppActionState,
> {
  /** Field values as strings, matching the shape the Server Action reads from `FormData`. */
  defaultValues: TValues;
  /**
   * The same Zod schema the Server Action validates with. Only the schema's input
   * shape needs to match `TValues` (controlled fields are always strings) - its
   * parsed output is never read here, so schemas that coerce types (e.g. a date
   * field) are fine. A schema with a `z.coerce.*` field reports that field's input
   * as `unknown`; cast such a schema to `z.ZodType<unknown, TValues>` at the call
   * site rather than loosening this type for every form.
   */
  schema: z.ZodType<unknown, TValues>;
  /** The Server Action this form submits to (pre-bound with any non-form arguments, e.g. an id). */
  action: AppFormAction<TState>;
  /** Called after a submission the Server Action reports as successful. */
  onSuccess?: (state: TState) => void;
}

/**
 * Shared form hook: validates client-side with the same Zod schema the Server Action
 * uses, then calls that Server Action directly on submit and maps its returned
 * `error`/`fieldErrors` back onto the form so they render through the same field-level
 * error slot as client-side validation errors.
 */
export function useAppForm<
  TValues extends Record<string, unknown>,
  TState extends AppActionState,
>({ defaultValues, schema, action, onSuccess }: UseAppFormOptions<TValues, TState>) {
  return useForm({
    defaultValues,
    validators: {
      onChange: schema,
      onSubmitAsync: async ({ value }) => {
        const formData = valuesToFormData(value);
        const state = await action({} as TState, formData);

        if (state.error || state.fieldErrors) {
          return {
            form: state.error,
            fields: state.fieldErrors
              ? Object.fromEntries(
                  Object.entries(state.fieldErrors).map(([field, messages]) => [
                    field,
                    messages[0],
                  ])
                )
              : undefined,
          };
        }

        onSuccess?.(state);
        return null;
      },
    },
  });
}

/**
 * Use as a field's `onBlur` handler instead of `field.handleBlur` directly.
 * `onChange` is the only schema validator (see `useAppForm`) - it never runs for a
 * field the user blurred without typing into, since no change event ever fired. This
 * marks the field touched *and* forces that same `onChange` validation to run, so an
 * untouched-but-invalid field gets an error on first blur, in the same error slot a
 * later real edit will naturally clear.
 */
export function handleFieldBlur(field: AnyFieldApi) {
  field.handleBlur();
  void field.validate("change");
}
