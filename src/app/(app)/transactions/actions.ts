"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { TransactionService } from "@/lib/services/transaction-service";
import {
  recordIncomeOrExpenseSchema,
  recordTransferSchema,
  updateTransactionSchema,
} from "@/lib/validation/transaction";
import { reservationConsentSchema, type ReservationConsentInput } from "@/lib/validation/goal-reservation";
import type { ReservationShortfall } from "@/lib/services/goal-reservation-service";
import { AppError } from "@/lib/errors";

export interface TransactionActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  /** Set instead of `error` when this transaction dips into a goal's reserve and needs the consent wizard (goal-reservation-guard spec). */
  reservationRequired?: ReservationShortfall;
}

/** Parses the wizard's Step 2 payload, sent as a JSON string under `reservationConsent` — absent for every ordinary submission. */
function parseReservationConsent(formData: FormData): ReservationConsentInput | undefined {
  const raw = formData.get("reservationConsent");
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const parsed = reservationConsentSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid reservation consent payload.");
  }
  return parsed.data;
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

// Every screen that can show transaction-derived data (Transactions itself,
// Income, Expenses, Dashboard, Reports) revalidates together — the
// alternative (each caller remembering which paths it affects) risks a
// screen quietly going stale after a mutation made from a different page's
// quick-add dialog (design.md D17).
function revalidateAllTransactionPaths() {
  revalidatePath("/transactions");
  revalidatePath("/income");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/accounts");
}

/**
 * Backs `<RecordTransactionDialog>` (design.md D17) — one action for all
 * three transaction kinds, dispatching on a hidden `kind` field, so the
 * dialog's tab/type switch doesn't need three separate `useActionState`
 * hooks.
 */
export async function recordTransactionAction(
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  try {
    const userId = await requireAuth();
    const kind = formData.get("kind");
    const consent = parseReservationConsent(formData);

    if (kind === "TRANSFER") {
      const parsed = recordTransferSchema.safeParse({
        sourceAccountId: formData.get("sourceAccountId"),
        destinationAccountId: formData.get("destinationAccountId"),
        amount: formData.get("amount"),
        vatAmount: orUndefined(formData.get("vatAmount")),
        transactionDate: formData.get("transactionDate"),
        description: orUndefined(formData.get("description")),
      });
      if (!parsed.success) {
        return { fieldErrors: parsed.error.flatten().fieldErrors };
      }
      await TransactionService.recordTransfer(userId, parsed.data, consent);
    } else if (kind === "INCOME" || kind === "EXPENSE") {
      const parsed = recordIncomeOrExpenseSchema.safeParse({
        accountId: formData.get("accountId"),
        categoryId: formData.get("categoryId"),
        amount: formData.get("amount"),
        vatAmount: kind === "EXPENSE" ? orUndefined(formData.get("vatAmount")) : undefined,
        transactionDate: formData.get("transactionDate"),
        description: orUndefined(formData.get("description")),
      });
      if (!parsed.success) {
        return { fieldErrors: parsed.error.flatten().fieldErrors };
      }
      if (kind === "INCOME") {
        await TransactionService.recordIncome(userId, parsed.data);
      } else {
        await TransactionService.recordExpense(userId, parsed.data, consent);
      }
    } else {
      return { error: "Choose a transaction type." };
    }

    revalidateAllTransactionPaths();
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

export async function updateTransactionAction(
  transactionId: string,
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateTransactionSchema.safeParse({
      categoryId: orUndefined(formData.get("categoryId")),
      amount: formData.get("amount"),
      vatAmount: formData.has("vatAmount") ? orNull(formData.get("vatAmount")) : undefined,
      transactionDate: formData.get("transactionDate"),
      description: orNull(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await TransactionService.update(userId, transactionId, parsed.data);
    revalidateAllTransactionPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export interface DeleteTransactionActionState {
  error?: string;
}

export async function deleteTransactionAction(transactionId: string): Promise<DeleteTransactionActionState> {
  try {
    const userId = await requireAuth();
    await TransactionService.delete(userId, transactionId);
    revalidateAllTransactionPaths();
    return {};
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}
