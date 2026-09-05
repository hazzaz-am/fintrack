## Why

Every data-entry form in the app currently only validates on the server: forms use React 19's native `<form action={formAction}>` with `useActionState`, so a user only learns a field is invalid after a full submit round-trip to a Server Action. `@tanstack/react-form` and `@tanstack/react-form-nextjs` are already installed but unused anywhere in `src/`, and the app already has a single shared Zod schema per domain in `src/lib/validation/` that Server Actions validate against — adopting TanStack Form now lets every form surface field-level validation immediately (on blur/change) by reusing those same schemas on the client, without duplicating validation rules or giving up Server Actions as the actual mutation path.

## What Changes

- Introduce a shared form architecture: a thin `useAppForm`-style wrapper around `@tanstack/react-form`, using `@tanstack/react-form-nextjs`'s Server Action adapter so the existing Server Actions remain the submission/mutation path and source of truth.
- Reuse the existing Zod schemas in `src/lib/validation/` as the single validator on both the client (field-level, on blur/change) and the server (unchanged Server Action `.safeParse` calls) — no parallel validation logic.
- Wire the existing shadcn-style `Field` / `FieldGroup` / `FieldLabel` / `FieldError` / `FieldDescription` composition to TanStack Form's field state instead of the current manual `useActionState`-threaded field errors.
- Migrate all 15 real data-entry forms from native `<form action>` + `useActionState` to TanStack Form: login, register, add/edit transaction, add/edit category, profile update, change password, add/edit account, add/edit investment, contribute to investment, record investment maturity, add/edit savings goal, allocate to goal, move allocation between goals, add/edit recurring transaction, confirm/skip recurring transaction.
- Add client-side (pre-submit) field validation feedback for the first time on every migrated form — today only post-submit server errors are shown.
- **BREAKING** (internal only): the internal prop contracts some dialog components use to thread `useActionState` state down to fields will change to TanStack Form's field API; no external API or route changes.

## Capabilities

### New Capabilities
- `forms`: shared client-side form architecture — TanStack Form + the Next.js Server Action adapter, reusing existing Zod schemas, defining validation timing (on blur/change vs. on submit) and error-display conventions used across the app's data-entry forms.

### Modified Capabilities
- `accounts-ui`: account add/edit form now validates fields client-side before submit, via TanStack Form, instead of only showing errors after a server round-trip.
- `auth-ui`: login and register forms gain client-side field validation.
- `expenses-ui`: expense entry/edit forms gain client-side field validation.
- `income-ui`: income entry/edit forms gain client-side field validation.
- `investments-ui`: add/edit investment, contribute, and record-maturity forms gain client-side field validation.
- `recurring-transactions`: add/edit recurring transaction template and confirm/skip forms gain client-side field validation.
- `savings-goals-ui`: add/edit savings goal, allocate, and move-allocation forms gain client-side field validation.
- `settings-ui`: profile update and change-password forms gain client-side field validation.
- `transactions-ui`: add/edit transaction forms gain client-side field validation.

## Impact

- Affected components: the 15 form/dialog components listed above under `src/app/(app)/**` and `src/app/(auth)/**`.
- No new dependencies — `@tanstack/react-form`, `@tanstack/react-form-devtools`, and `@tanstack/react-form-nextjs` are already in `package.json`.
- Server Actions in `src/app/(app)/**/actions.ts` and `src/app/(auth)/actions.ts` keep their existing signatures and Zod validation; only how the client calls them changes.
- Likely new shared code under `src/lib/forms/` or `src/hooks/` for the form wrapper (finalized in design.md).
- No database, API route, or auth changes.
