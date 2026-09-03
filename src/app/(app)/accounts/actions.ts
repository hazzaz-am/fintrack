"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { AccountService } from "@/lib/services/account-service";
import { createAccountSchema, updateAccountSchema } from "@/lib/validation/account";
import { AppError } from "@/lib/errors";

export interface AccountActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function orUndefined(value: FormDataEntryValue | null): string | undefined {
  const str = typeof value === "string" ? value.trim() : "";
  return str === "" ? undefined : str;
}

function orNull(value: FormDataEntryValue | null): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createAccountAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireAuth();
    const parsed = createAccountSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      institution: orUndefined(formData.get("institution")),
      openingBalance: orUndefined(formData.get("openingBalance")) ?? "0.00",
      currency: formData.get("currency"),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await AccountService.create(userId, parsed.data);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateAccountAction(
  accountId: string,
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateAccountSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      institution: orNull(formData.get("institution")),
      currency: formData.get("currency"),
      description: orNull(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await AccountService.update(userId, accountId, parsed.data);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function archiveAccountAction(accountId: string): Promise<void> {
  const userId = await requireAuth();
  await AccountService.archive(userId, accountId);
  revalidatePath("/accounts");
}
