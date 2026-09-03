"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "../actions";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError errors={state.fieldErrors?.email?.map((message) => ({ message }))} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          <FieldError errors={state.fieldErrors?.password?.map((message) => ({ message }))} />
        </Field>
        {state.error && <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
        <SubmitButton />
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
