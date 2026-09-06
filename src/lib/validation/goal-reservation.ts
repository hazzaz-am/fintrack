import { z } from "zod";
import { zPositiveMoney } from "./money";
import { AppError } from "@/lib/errors";

// One goal's share of a reserved-funds shortfall, typed by the user in Step 2
// of the consent wizard (goal-reservation-guard spec, "Reservation Consent
// Wizard"). `returnBy` present means "returning by this date" (a
// GoalReservationPromise is created); absent means "permanent reduction" (no
// promise, just the negative ledger entry).
export const reservationConsentAllocationSchema = z.object({
  goalId: z.string().cuid(),
  amount: zPositiveMoney,
  returnBy: z.coerce.date().optional(),
});

// The whole Step 2 submission. `concent` stands in for the literal "CONCENT"
// text match enforced client-side in Step 1 — the server only needs to know
// consent was actually given, not re-validate the exact string.
export const reservationConsentSchema = z.object({
  concent: z.literal(true),
  allocations: z.array(reservationConsentAllocationSchema).min(1),
});

export type ReservationConsentAllocationInput = z.infer<typeof reservationConsentAllocationSchema>;
export type ReservationConsentInput = z.infer<typeof reservationConsentSchema>;

export const returnAgainstPromiseSchema = z.object({
  amount: zPositiveMoney,
});

export type ReturnAgainstPromiseInput = z.infer<typeof returnAgainstPromiseSchema>;

// Shared by every Server Action whose form can trigger the reservation
// consent wizard (investments, borrowers) — the wizard's confirm step
// resubmits the original FormData plus this JSON-encoded field.
export function parseReservationConsent(formData: FormData): ReservationConsentInput | undefined {
  const raw = formData.get("reservationConsent");
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const parsed = reservationConsentSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid reservation consent payload.");
  }
  return parsed.data;
}
