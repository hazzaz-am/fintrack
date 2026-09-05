"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { GoalReservationService } from "@/lib/services/goal-reservation-service";
import { returnAgainstPromiseSchema } from "@/lib/validation/goal-reservation";
import { AppError } from "@/lib/errors";

export interface ReservationActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

// The banner reads from the Dashboard, but a return/write-off also changes a
// goal's derived allocated total — so Savings Goals has to revalidate too, or
// it'd quietly show a stale total until some other mutation happened to
// touch that page.
function revalidateReservationPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/savings-goals");
}

export async function returnAgainstPromiseAction(
  promiseId: string,
  _prevState: ReservationActionState,
  formData: FormData
): Promise<ReservationActionState> {
  try {
    const userId = await requireAuth();
    const parsed = returnAgainstPromiseSchema.safeParse({ amount: formData.get("amount") });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await GoalReservationService.returnAgainstPromise(userId, promiseId, parsed.data.amount);
    revalidateReservationPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

export async function writeOffPromiseAction(promiseId: string): Promise<void> {
  const userId = await requireAuth();
  await GoalReservationService.writeOffPromise(userId, promiseId);
  revalidateReservationPaths();
}
