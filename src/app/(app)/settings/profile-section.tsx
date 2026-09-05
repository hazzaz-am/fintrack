"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction, changePasswordAction } from "./actions";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/auth";
import { useAppForm, handleFieldBlur } from "@/lib/forms/use-app-form";
import { AppFieldError } from "@/lib/forms/app-field-error";
import type { PublicUser } from "@/lib/services/auth-service";

export function ProfileSection({ user }: { user: PublicUser }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Requires your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const [justSucceeded, setJustSucceeded] = useState(false);

  const form = useAppForm({
    defaultValues: { name: user.name, email: user.email },
    schema: updateProfileSchema,
    action: updateProfileAction,
    onSuccess: () => setJustSucceeded(true),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setJustSucceeded(false);
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
                maxLength={120}
                value={field.state.value ?? ""}
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
                value={field.state.value ?? ""}
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
        {justSucceeded && <p className="text-sm font-medium text-positive">Profile updated.</p>}
      </FieldGroup>
      <div className="mt-4 flex justify-end">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [justSucceeded, setJustSucceeded] = useState(false);

  const form = useAppForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    schema: changePasswordSchema,
    action: changePasswordAction,
    onSuccess: () => {
      setJustSucceeded(true);
      form.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setJustSucceeded(false);
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="currentPassword">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Current password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={() => handleFieldBlur(field)}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <AppFieldError field={field} />
            </Field>
          )}
        </form.Field>
        <form.Field name="newPassword">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>New password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                minLength={8}
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
        {justSucceeded && <p className="text-sm font-medium text-positive">Password changed.</p>}
      </FieldGroup>
      <div className="mt-4 flex justify-end">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Changing…" : "Change password"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
