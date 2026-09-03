import {
  startOfDay,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
  differenceInCalendarQuarters,
  differenceInCalendarYears,
} from "date-fns";
import type { RecurringFrequency } from "@/lib/validation/recurring-transaction";

export interface RecurringSlot {
  slotStart: Date;
  slotEnd: Date;
}

function addPeriod(date: Date, count: number, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(date, count);
    case "MONTHLY":
      return addMonths(date, count);
    case "QUARTERLY":
      return addQuarters(date, count);
    case "YEARLY":
      return addYears(date, count);
  }
}

function roughPeriodEstimate(start: Date, today: Date, frequency: RecurringFrequency): number {
  switch (frequency) {
    case "WEEKLY":
      return differenceInCalendarWeeks(today, start);
    case "MONTHLY":
      return differenceInCalendarMonths(today, start);
    case "QUARTERLY":
      return differenceInCalendarQuarters(today, start);
    case "YEARLY":
      return differenceInCalendarYears(today, start);
  }
}

/**
 * The number of whole periods elapsed between `start` and `today` (design.md
 * D23) — i.e. the largest `k` such that `addPeriod(start, k) <= today`.
 * date-fns' calendar-difference helpers are only an estimate near
 * month/quarter/year boundaries (e.g. a Jan 31 start vs. a Feb 15 "today" is
 * one calendar month apart, but `addMonths(Jan 31, 1)` rolls to a date after
 * Feb 15) — the correction loop below fixes that estimate to the exact
 * boundary regardless of day-of-month rollover, in at most a couple of steps.
 */
function periodsElapsed(start: Date, today: Date, frequency: RecurringFrequency): number {
  let k = roughPeriodEstimate(start, today, frequency);
  while (k > 0 && addPeriod(start, k, frequency) > today) k--;
  while (addPeriod(start, k + 1, frequency) <= today) k++;
  return k;
}

/**
 * The current scheduled slot for a recurring template, or `null` when it
 * hasn't started yet or has already passed its end date (design.md D23,
 * D26). No stored `nextOccurrence` — this is recomputed from `startDate` +
 * `frequency` relative to `reference` every time it's needed.
 */
export function resolveCurrentSlot(
  startDate: Date,
  frequency: RecurringFrequency,
  endDate?: Date | null,
  reference: Date = new Date()
): RecurringSlot | null {
  const start = startOfDay(startDate);
  const today = startOfDay(reference);
  if (start > today) return null;

  const k = periodsElapsed(start, today, frequency);
  const slotStart = addPeriod(start, k, frequency);

  if (endDate && slotStart > startOfDay(endDate)) return null;

  const slotEnd = addPeriod(start, k + 1, frequency);
  return { slotStart, slotEnd };
}
