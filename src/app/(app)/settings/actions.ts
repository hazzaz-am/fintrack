"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { AuthService } from "@/lib/services/auth-service";
import { CategoryService } from "@/lib/services/category-service";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/auth";
import { createCategorySchema, updateCategorySchema } from "@/lib/validation/category";
import { AppError } from "@/lib/errors";

export interface SettingsActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

function orUndefined(value: FormDataEntryValue | null): string | undefined {
  const str = typeof value === "string" ? value.trim() : "";
  return str === "" ? undefined : str;
}

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateProfileSchema.safeParse({
      name: orUndefined(formData.get("name")),
      email: orUndefined(formData.get("email")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await AuthService.updateProfile(userId, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function changePasswordAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireAuth();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await AuthService.changePassword(userId, parsed.data);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function createCategoryAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireAuth();
    const parsed = createCategorySchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      icon: orUndefined(formData.get("icon")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await CategoryService.create(userId, parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateCategorySchema.safeParse({
      name: orUndefined(formData.get("name")),
      icon: orUndefined(formData.get("icon")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await CategoryService.update(userId, categoryId, parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const userId = await requireAuth();
  await CategoryService.delete(userId, categoryId);
  revalidatePath("/settings");
}

export async function getCategoryUsageCountAction(categoryId: string): Promise<number> {
  const userId = await requireAuth();
  return CategoryService.getUsageCount(userId, categoryId);
}
