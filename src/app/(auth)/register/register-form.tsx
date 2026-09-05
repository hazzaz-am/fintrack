"use client";

import Link from "next/link";
import { registerAction } from "../actions";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

const defaultValues: RegisterInput = { name: "", email: "", password: "" };

export function RegisterForm() {
  const form = useAppForm({
    defaultValues,
    schema: registerSchema,
    action: registerAction,
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
                autoComplete="name"
                maxLength={120}
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="email"
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
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
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          )}
        </form.Subscribe>
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
