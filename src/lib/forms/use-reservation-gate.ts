"use client";

import { useState, useTransition } from "react";
import type { ReservationConsentResult, ReservationGoalOption } from "@/components/goal-reservation/reservation-consent-wizard";
import type { AppActionState } from "@/lib/forms/use-app-form";

export interface ReservationRequiredInfo {
  shortfall: string;
  unallocated: string;
  goals: ReservationGoalOption[];
}

interface ReservationAwareState extends AppActionState {
  reservationRequired?: ReservationRequiredInfo;
}

/**
 * Wraps a Server Action that may respond with `reservationRequired`
 * (goal-reservation-guard spec) instead of succeeding outright. Intercepts
 * that response before it ever reaches `useAppForm`'s validator — from
 * `useAppForm`'s point of view the submission just "didn't error and didn't
 * succeed" (so it neither shows a field error nor calls `onSuccess`) — and
 * exposes wizard state the caller renders a `<ReservationConsentWizard>`
 * from. The wizard's own confirm re-invokes the same raw action directly
 * (bypassing tanstack-form entirely) with the original FormData plus the
 * consent payload attached.
 */
export function useReservationGate<TState extends ReservationAwareState>(
  rawAction: (prevState: TState, formData: FormData) => Promise<TState>
) {
  const [reservation, setReservation] = useState<ReservationRequiredInfo | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function gatedAction(prevState: TState, formData: FormData): Promise<TState> {
    const state = await rawAction(prevState, formData);
    if (state.reservationRequired) {
      setPendingFormData(formData);
      setReservation(state.reservationRequired);
      setWizardError(null);
      return { ...state, error: undefined, fieldErrors: undefined, success: false, reservationRequired: undefined };
    }
    return state;
  }

  function cancel() {
    setReservation(null);
    setPendingFormData(null);
    setWizardError(null);
  }

  function confirm(consent: ReservationConsentResult, onDone: (state: TState) => void) {
    if (!pendingFormData) return;
    const formData = pendingFormData;
    formData.set("reservationConsent", JSON.stringify(consent));
    startTransition(async () => {
      const state = await rawAction({} as TState, formData);
      if (state.reservationRequired) {
        // The buffer moved (a concurrent write) between the pre-check and
        // this confirm — show the refreshed shortfall/goals rather than a
        // generic error, so the user can just adjust and retry.
        setReservation(state.reservationRequired);
        setWizardError(null);
      } else if (state.error || state.fieldErrors) {
        setWizardError(state.error ?? "That split isn't valid — check the amounts.");
      } else {
        cancel();
        onDone(state);
      }
    });
  }

  return { gatedAction, reservation, wizardError, isPending, cancel, confirm };
}
