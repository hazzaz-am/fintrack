"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  allocateSchema,
  moveAllocationSchema,
} from "@/lib/validation/savings-goal";
import { AppError } from "@/lib/errors";

export interface SavingsGoalActionState {
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

export async function createGoalAction(
  _prevState: SavingsGoalActionState,
  formData: FormData
): Promise<SavingsGoalActionState> {
  try {
    const userId = await requireAuth();
    const parsed = createSavingsGoalSchema.safeParse({
      name: formData.get("name"),
      targetAmount: formData.get("targetAmount"),
      targetDate: orUndefined(formData.get("targetDate")),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await SavingsGoalService.create(userId, parsed.data);
    revalidatePath("/savings-goals");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateGoalAction(
  goalId: string,
  _prevState: SavingsGoalActionState,
  formData: FormData
): Promise<SavingsGoalActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateSavingsGoalSchema.safeParse({
      name: orUndefined(formData.get("name")),
      targetAmount: orUndefined(formData.get("targetAmount")),
      targetDate: orNull(formData.get("targetDate")),
      description: orNull(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await SavingsGoalService.update(userId, goalId, parsed.data);
    revalidatePath("/savings-goals");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function archiveGoalAction(goalId: string): Promise<void> {
  const userId = await requireAuth();
  await SavingsGoalService.archive(userId, goalId);
  revalidatePath("/savings-goals");
}

export async function allocateAction(
  goalId: string,
  _prevState: SavingsGoalActionState,
  formData: FormData
): Promise<SavingsGoalActionState> {
  try {
    const userId = await requireAuth();
    const parsed = allocateSchema.safeParse({
      goalId,
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      note: orUndefined(formData.get("note")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await SavingsGoalService.allocate(userId, parsed.data);
    revalidatePath("/savings-goals");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function moveAllocationAction(
  fromGoalId: string,
  _prevState: SavingsGoalActionState,
  formData: FormData
): Promise<SavingsGoalActionState> {
  try {
    const userId = await requireAuth();
    const parsed = moveAllocationSchema.safeParse({
      fromGoalId,
      toGoalId: formData.get("toGoalId"),
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      note: orUndefined(formData.get("note")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await SavingsGoalService.moveAllocation(userId, parsed.data);
    revalidatePath("/savings-goals");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}
