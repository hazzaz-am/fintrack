"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { RecurringTransactionService } from "@/lib/services/recurring-transaction-service";
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
  confirmRecurringTransactionSchema,
} from "@/lib/validation/recurring-transaction";
import { AppError } from "@/lib/errors";

export interface RecurringTransactionActionState {
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

function revalidateRecurringPaths() {
  revalidatePath("/recurring-transactions");
  revalidatePath("/dashboard");
}

// Confirming creates an ordinary Transaction (design.md D25), so it has to
// revalidate the same surfaces any other transaction write does, not just
// the recurring-transactions screen.
function revalidateAfterConfirm() {
  revalidateRecurringPaths();
  revalidatePath("/transactions");
  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/accounts");
}

export async function createRecurringTransactionAction(
  _prevState: RecurringTransactionActionState,
  formData: FormData
): Promise<RecurringTransactionActionState> {
  try {
    const userId = await requireAuth();
    const parsed = createRecurringTransactionSchema.safeParse({
      name: formData.get("name"),
      accountId: formData.get("accountId"),
      categoryId: formData.get("categoryId"),
      type: formData.get("type"),
      amount: formData.get("amount"),
      frequency: formData.get("frequency"),
      startDate: formData.get("startDate"),
      endDate: orUndefined(formData.get("endDate")),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await RecurringTransactionService.create(userId, parsed.data);
    revalidateRecurringPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateRecurringTransactionAction(
  id: string,
  _prevState: RecurringTransactionActionState,
  formData: FormData
): Promise<RecurringTransactionActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateRecurringTransactionSchema.safeParse({
      name: orUndefined(formData.get("name")),
      accountId: orUndefined(formData.get("accountId")),
      categoryId: orUndefined(formData.get("categoryId")),
      amount: orUndefined(formData.get("amount")),
      frequency: orUndefined(formData.get("frequency")),
      startDate: orUndefined(formData.get("startDate")),
      endDate: orNull(formData.get("endDate")),
      description: orNull(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await RecurringTransactionService.update(userId, id, parsed.data);
    revalidateRecurringPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function archiveRecurringTransactionAction(id: string): Promise<void> {
  const userId = await requireAuth();
  await RecurringTransactionService.archive(userId, id);
  revalidateRecurringPaths();
}

export async function confirmRecurringTransactionAction(
  id: string,
  _prevState: RecurringTransactionActionState,
  formData: FormData
): Promise<RecurringTransactionActionState> {
  try {
    const userId = await requireAuth();
    const parsed = confirmRecurringTransactionSchema.safeParse({
      amount: orUndefined(formData.get("amount")),
      transactionDate: orUndefined(formData.get("transactionDate")),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await RecurringTransactionService.confirm(userId, id, parsed.data);
    revalidateAfterConfirm();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}
