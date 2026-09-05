## Context

Every data-entry form in the app (15 forms across 9 UI capabilities) currently uses React 19's native `<form action={formAction}>` + `useActionState`, submitting straight to a `"use server"` Server Action that validates with a shared Zod schema from `src/lib/validation/` and returns `{ error, fieldErrors, success }`. There is no client-side validation anywhere — the first feedback a user gets is after a full round trip. `@tanstack/react-form`, `@tanstack/react-form-devtools`, and `@tanstack/react-form-nextjs` are already installed but unused. Field composition everywhere already goes through shared shadcn-style `Field` / `FieldGroup` / `FieldLabel` / `FieldError` / `FieldDescription` components.

## Goals / Non-Goals

**Goals:**
- Give every migrated form immediate field-level validation feedback (on blur, then on change) before submit, reusing the existing domain Zod schema as the single source of truth for both client and server validation.
- Keep Server Actions as the sole mutation/authorization boundary — server-side `.safeParse` stays as defense-in-depth, unchanged.
- Introduce one shared hook so each form's migration is mechanical and every form follows the same pattern.
- Reuse the existing `Field`/`FieldGroup`/`FieldError` components unchanged, wiring TanStack Form's field state into them instead of `useActionState`'s `fieldErrors`.
- Migrate all 15 identified forms in this change — no form left on the old pattern.

**Non-Goals:**
- No new validation rules or behavior changes beyond validation *timing* — no existing Zod rule gets tightened or loosened.
- Not moving off Server Actions to client-side fetch/mutation or TanStack Query.
- Not adopting `@tanstack/react-form-nextjs`'s `createServerValidate`/`mergeForm` SSR pattern (see Decision 2) — Server Action signatures do not change.
- Not touching confirmation-only dialogs with no editable fields (archive/delete/deactivate confirmations) — they aren't forms in the validation sense.
- No visual/styling redesign of forms or fields.

## Decisions

**1. Shared `useAppForm` hook wraps plain `@tanstack/react-form`, not the Next.js SSR adapter.**
Create `src/lib/forms/use-app-form.ts` wrapping `@tanstack/react-form`'s `useForm`. The actual Server Action call happens inside `validators.onSubmitAsync` (TanStack Form's documented mechanism for async submission-time validation): it calls the existing Server Action directly with the form's values converted to `FormData`, and if the action returns `{ error, fieldErrors }`, returns `{ form: error, fields: fieldErrors }` from the validator — TanStack Form's built-in handling then renders those against the matching fields exactly like a client-side schema error, no manual `setFieldMeta` needed. If the action succeeds, an `onSuccess` callback runs (closing the dialog, etc.). Pending state comes from TanStack Form's own `form.state.isSubmitting` (via `form.Subscribe`), replacing `useFormStatus()`.

*Alternative considered:* adopt `@tanstack/react-form-nextjs`'s `createServerValidate` / `ServerValidateError` / `mergeForm` pattern (the package's intended SSR integration — confirmed via current TanStack Form docs). Rejected for this change: it requires rewriting every Server Action's validation call and return shape to `createServerValidate({ ...formOpts, onServerValidate })` / catching `ServerValidateError`, which touches server-side, auth-adjacent code across 8 action files — a materially bigger and riskier surface than a client-only UI migration, and the progressive-enhancement benefit it buys (forms work without JS) doesn't matter for an authenticated dashboard that already requires JS. `@tanstack/react-form-nextjs` stays an installed-but-unused dependency after this change; whether to adopt its SSR pattern later or drop the dependency is an open question below.

**2. Validation source and timing.**
Pass the existing domain Zod schema (e.g. `accountSchema`) directly as the form's `validators.onChange` (TanStack Form has native Standard Schema support for Zod) — this is the only schema validator registered, so there is exactly one error slot per field. `onChange` alone never runs for a field the user blurs without ever typing into (no change event fires), so a shared `handleFieldBlur(field)` helper (`src/lib/forms/use-app-form.ts`) is used as every field's `onBlur` instead of `field.handleBlur` directly: it marks the field touched *and* calls `field.validate("change")` to force that same validator to run. A later real edit naturally overwrites/clears that same slot — no separate `onBlur` validator, which was tried first and left a stale error after a valid correction (TanStack Form doesn't share error state across different validator keys). The form re-validates once more on submit as the final client-side gate before calling the Server Action. Because these schemas already validate the string-shaped values pulled from `FormData` today, binding form fields as strings (not coercing to `number`/`Date` until submit) keeps client and server validation looking at identical input shapes — no schema changes needed.

**2a. Serializing form values back to `FormData` mirrors native form submission, not JS truthiness.**
The helper that builds `FormData` from the form's values before calling the Server Action (`valuesToFormData` in `use-app-form.ts`) sends every key present in the form's values, converting `undefined`/`null` to `""` rather than omitting the key - exactly what a native `<form>` submission already does (a named input is always present, even empty). Server Actions already normalize `""` back to `undefined`/`null` per field (`orUndefined`/`orNull` in each `actions.ts`), including the "clear this field" case on edit forms (an edit form's optional field uses `null`, not `undefined`, matching the schema's `.nullable()`).

**3. Rules that need fresh server state stay server-checked.**
Some checks depend on data TanStack Form's client-side schema validation can't see without a stale read (e.g. "email already registered", "wrong current password", "allocation exceeds account's current unallocated balance"). These keep surfacing exactly as today: via the Server Action's returned error, displayed through the same `FieldError`/inline-error slot. The one existing ad hoc client-side guard (`record-maturity-dialog.tsx`'s "principal ≤ known derived principal" check) is carried over as a schema-level `.refine`/`.superRefine` so it runs through the same shared validator as every other field rule instead of bespoke component state.

**4. All 15 forms migrate in this change; no partial rollout.**
The shared hook makes each form's migration mechanical (swap `useActionState` + manual field-error plumbing for `useAppForm` + the domain schema as validator), so a mixed old/new pattern across forms would only add confusion without reducing risk.

## Risks / Trade-offs

- **[Risk]** Reshaping each Server Action's response into per-field errors on the client is manual per-form glue code (not the adapter's built-in `mergeForm`). → **Mitigation:** put this glue inside `useAppForm` once (a `submitViaAction(action, formData)` helper), so each of the 15 forms calls one shared function rather than reimplementing the mapping.
- **[Risk]** Migrating 15 forms in one change is a large surface for regressions. → **Mitigation:** migrate the simplest form first (category dialog) to validate the shared hook pattern end-to-end, then apply the same pattern to the rest; Server Actions and services are untouched, so existing service-level tests keep covering the actual mutation logic.
- **[Risk]** `@tanstack/react-form-nextjs` remains installed but unused, which could read as dead weight or an abandoned migration path. → **Mitigation:** call this out explicitly in this design doc (Decision 1) and leave the "adopt fully or remove" choice as an explicit open question rather than silently ignoring it.

## Migration Plan

No data model or Server Action signature changes, so no rollback/backfill concerns beyond normal code revert. Ship as a single change; `@tanstack/react-form`/`@tanstack/react-form-devtools` are already present in `package.json`/the lockfile, so no dependency-install step is needed. Enable `@tanstack/react-form-devtools` in development only, following whatever dev-only convention (`NODE_ENV` check or similar) the app already uses elsewhere.

## Open Questions

- Should `@tanstack/react-form-nextjs`'s `createServerValidate`/`mergeForm` SSR pattern be adopted later as a follow-up change (rewriting Server Actions for progressive enhancement), or should the dependency be removed from `package.json` if it's staying unused? Not blocking this change either way.
