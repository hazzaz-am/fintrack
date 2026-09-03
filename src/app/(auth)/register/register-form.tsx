"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { registerAction, type AuthActionState } from "../actions";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required maxLength={120} />
          <FieldError errors={state.fieldErrors?.name?.map((message) => ({ message }))} />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError errors={state.fieldErrors?.email?.map((message) => ({ message }))} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <FieldDescription>At least 8 characters.</FieldDescription>
          <FieldError errors={state.fieldErrors?.password?.map((message) => ({ message }))} />
        </Field>
        {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
        <SubmitButton />
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
