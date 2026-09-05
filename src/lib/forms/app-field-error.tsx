"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { FieldError } from "@/components/ui/field";

/**
 * Renders a TanStack Form field's errors through the shared `FieldError` component,
 * shown once the field has been touched (blurred) or a submit was attempted -
 * so errors don't appear before the user has interacted with the field.
 */
export function AppFieldError({ field }: { field: AnyFieldApi }) {
  const shouldShow = field.state.meta.isTouched || field.form.state.submissionAttempts > 0;
  if (!shouldShow) return null;

  const errors = field.state.meta.errors.map((error) => ({
    message: typeof error === "string" ? error : error?.message,
  }));

  return <FieldError errors={errors} />;
}
