"use client";

import Link from "next/link";
import { loginAction } from "../actions";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

const defaultValues: LoginInput = { email: "", password: "" };

export function LoginForm() {
  const form = useAppForm({
    defaultValues,
    schema: loginSchema,
    action: loginAction,
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
                autoComplete="current-password"
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
              <p role="alert" className="text-sm font-medium text-destructive">
                {String(formError)}
              </p>
            ) : null
          }
        </form.Subscribe>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          )}
        </form.Subscribe>
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
