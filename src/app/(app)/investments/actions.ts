"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { InvestmentService } from "@/lib/services/investment-service";
import {
  createInvestmentWithContributionSchema,
  updateInvestmentSchema,
  contributeInvestmentSchema,
  recordMaturityOrWithdrawalSchema,
} from "@/lib/validation/investment";
import { reservationConsentSchema, type ReservationConsentInput } from "@/lib/validation/goal-reservation";
import type { ReservationShortfall } from "@/lib/services/goal-reservation-service";
import { AppError } from "@/lib/errors";

export interface InvestmentActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  /** Set instead of `error` when this contribution dips into a goal's reserve and needs the consent wizard (goal-reservation-guard spec). */
  reservationRequired?: ReservationShortfall;
}

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

// Investments' totals/maturities are read on the Dashboard (already wired in
// transactions-and-analytics-ui), so any mutation here has to revalidate
// both surfaces or the Dashboard would quietly go stale.
function revalidateInvestmentPaths() {
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

/**
 * Backs `<InvestmentFormDialog>`'s create mode (design.md D19) — one action
 * for all three funding shapes (fund now / already-owned / skip), dispatching
 * on a hidden `fundingMode` field, calling `createWithInitialContribution`
 * which already accepts all three shapes in one DB transaction.
 */
export async function createInvestmentAction(
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  try {
    const userId = await requireAuth();
    const fundingMode = formData.get("fundingMode");

    const base = {
      name: formData.get("name"),
      type: formData.get("type"),
      institution: orUndefined(formData.get("institution")),
      startDate: formData.get("startDate"),
      maturityDate: orUndefined(formData.get("maturityDate")),
      expectedReturnAmount: orUndefined(formData.get("expectedReturnAmount")),
      expectedReturnRate: orUndefined(formData.get("expectedReturnRate")),
      currentValue: orUndefined(formData.get("currentValue")),
      notes: orUndefined(formData.get("notes")),
    };

    const input =
      fundingMode === "fund"
        ? { ...base, accountId: formData.get("accountId"), contributionAmount: formData.get("contributionAmount") }
        : fundingMode === "owned"
          ? { ...base, openingPrincipal: formData.get("openingPrincipal") }
          : base;

    const parsed = createInvestmentWithContributionSchema.safeParse(input);
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const consent = parseReservationConsent(formData);
    await InvestmentService.createWithInitialContribution(userId, parsed.data, consent);
    revalidateInvestmentPaths();
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

export async function updateInvestmentAction(
  investmentId: string,
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  try {
    const userId = await requireAuth();
    const parsed = updateInvestmentSchema.safeParse({
      name: orUndefined(formData.get("name")),
      institution: orNull(formData.get("institution")),
      maturityDate: orNull(formData.get("maturityDate")),
      expectedReturnAmount: orNull(formData.get("expectedReturnAmount")),
      expectedReturnRate: orNull(formData.get("expectedReturnRate")),
      currentValue: orNull(formData.get("currentValue")),
      notes: orNull(formData.get("notes")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await InvestmentService.update(userId, investmentId, parsed.data);
    revalidateInvestmentPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function contributeAction(
  investmentId: string,
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  try {
    const userId = await requireAuth();
    const parsed = contributeInvestmentSchema.safeParse({
      investmentId,
      accountId: formData.get("accountId"),
      amount: formData.get("amount"),
      transactionDate: formData.get("transactionDate"),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const consent = parseReservationConsent(formData);
    await InvestmentService.contribute(userId, parsed.data, consent);
    revalidateInvestmentPaths();
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

/**
 * Backs `<RecordMaturityDialog>` (design.md D20). `newStatus` is constrained
 * by `recordMaturityOrWithdrawalSchema` to Matured/Withdrawn only — there is
 * no "stays Active" outcome to offer (see design.md Context).
 */
export async function recordMaturityAction(
  investmentId: string,
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  try {
    const userId = await requireAuth();
    const parsed = recordMaturityOrWithdrawalSchema.safeParse({
      investmentId,
      accountId: formData.get("accountId"),
      principalAmount: formData.get("principalAmount"),
      profitAmount: orUndefined(formData.get("profitAmount")),
      transactionDate: formData.get("transactionDate"),
      newStatus: formData.get("newStatus"),
      description: orUndefined(formData.get("description")),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await InvestmentService.recordMaturityOrWithdrawal(userId, parsed.data);
    revalidateInvestmentPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}
