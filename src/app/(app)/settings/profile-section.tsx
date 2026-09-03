"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction, changePasswordAction, type SettingsActionState } from "./actions";
import type { PublicUser } from "@/lib/services/auth-service";

const initialState: SettingsActionState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ProfileSection({ user }: { user: PublicUser }) {
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction] = useActionState(changePasswordAction, initialState);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" required maxLength={120} defaultValue={user.name} />
                <FieldError errors={profileState.fieldErrors?.name?.map((message) => ({ message }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" required defaultValue={user.email} />
                <FieldError errors={profileState.fieldErrors?.email?.map((message) => ({ message }))} />
              </Field>
              {profileState.error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {profileState.error}
                </p>
              )}
              {profileState.success && (
                <p className="text-sm font-medium text-positive">Profile updated.</p>
              )}
            </FieldGroup>
            <div className="mt-4 flex justify-end">
              <SubmitButton label="Save changes" pendingLabel="Saving…" />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Requires your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} key={passwordState.success ? "reset" : "form"}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                <Input id="currentPassword" name="currentPassword" type="password" required />
                <FieldError errors={passwordState.fieldErrors?.currentPassword?.map((message) => ({ message }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
                <FieldError errors={passwordState.fieldErrors?.newPassword?.map((message) => ({ message }))} />
              </Field>
              {passwordState.error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {passwordState.error}
                </p>
              )}
              {passwordState.success && (
                <p className="text-sm font-medium text-positive">Password changed.</p>
              )}
            </FieldGroup>
            <div className="mt-4 flex justify-end">
              <SubmitButton label="Change password" pendingLabel="Changing…" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
