"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { BorrowerService } from "@/lib/services/borrower-service";
import {
  createBorrowerSchema,
  updateBorrowerSchema,
  disburseLoanSchema,
  recordRepaymentSchema,
  updateLoanDueDateSchema,
} from "@/lib/validation/borrower";
import { parseReservationConsent } from "@/lib/validation/goal-reservation";
import type { ReservationShortfall } from "@/lib/services/goal-reservation-service";
import { AppError } from "@/lib/errors";

export interface BorrowerActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  /** Set instead of `error` when this disbursement dips into a goal's reserve and needs the consent wizard (goal-reservation-guard spec). */
  reservationRequired?: ReservationShortfall;
}

function revalidateBorrowerPaths() {
  revalidatePath("/borrowers");
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

export async function createBorrowerAction(
  _prevState: BorrowerActionState,
  formData: FormData
): Promise<BorrowerActionState> {
  try {
    const userId = await requireAuth();
    const parsed = createBorrowerSchema.safeParse({
      name: formData.get("name"),
      notes: orUndefined(formData.get("notes")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await BorrowerService.create(userId, parsed.data);
    revalidateBorrowerPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateBorrowerAction(
  borrowerId: string,
  _prevState: BorrowerActionState,
  formData: FormData
): Promise<BorrowerActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateBorrowerSchema.safeParse({
      name: orUndefined(formData.get("name")),
      notes: orNull(formData.get("notes")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await BorrowerService.update(userId, borrowerId, parsed.data);
    revalidateBorrowerPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function disburseLoanAction(
  borrowerId: string,
  _prevState: BorrowerActionState,
  formData: FormData
): Promise<BorrowerActionState> {
  try {
    const userId = await requireAuth();
    const parsed = disburseLoanSchema.safeParse({
      borrowerId,
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      disbursedDate: formData.get("disbursedDate"),
      dueDate: formData.get("dueDate"),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const consent = parseReservationConsent(formData);
    await BorrowerService.disburseLoan(userId, parsed.data, consent);
    revalidateBorrowerPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RESERVATION_CONSENT_REQUIRED") {
        return { reservationRequired: error.details as ReservationShortfall };
      }
      return { error: error.message };
    }
    throw error;
  }
}

export async function recordRepaymentAction(
  loanId: string,
  _prevState: BorrowerActionState,
  formData: FormData
): Promise<BorrowerActionState> {
  try {
    const userId = await requireAuth();
    const parsed = recordRepaymentSchema.safeParse({
      loanId,
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      transactionDate: formData.get("transactionDate"),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await BorrowerService.recordRepayment(userId, parsed.data);
    revalidateBorrowerPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function updateLoanDueDateAction(
  loanId: string,
  _prevState: BorrowerActionState,
  formData: FormData
): Promise<BorrowerActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateLoanDueDateSchema.safeParse({ dueDate: formData.get("dueDate") });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await BorrowerService.updateDueDate(userId, loanId, parsed.data.dueDate);
    revalidateBorrowerPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function writeOffLoanAction(loanId: string): Promise<void> {
  const userId = await requireAuth();
  await BorrowerService.writeOffLoan(userId, loanId);
  revalidateBorrowerPaths();
}
