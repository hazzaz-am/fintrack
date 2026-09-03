import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  subMonths,
} from "date-fns";

// Shared across Transactions, Income, Expenses, Dashboard, and Reports
// (design.md D16) so "this week/month/year/custom range" is computed
// identically everywhere it appears, instead of once per screen.
export const DATE_RANGE_PERIODS = ["day", "week", "month", "year", "custom"] as const;
export type DateRangePeriod = (typeof DATE_RANGE_PERIODS)[number];

export interface ResolvedDateRange {
  from: Date;
  to: Date;
}

/**
 * Pure date-boundary resolution — no DB access. Services only ever receive
 * the resolved `{from, to}`, never the period string (matches
 * `TransactionService.getSummary`'s existing signature).
 */
export function resolveDateRange(
  period: DateRangePeriod,
  custom?: { from?: Date; to?: Date },
  reference: Date = new Date()
): ResolvedDateRange {
  switch (period) {
    case "day":
      return { from: startOfDay(reference), to: endOfDay(reference) };
    case "week":
      return { from: startOfWeek(reference), to: endOfWeek(reference) };
    case "month":
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
    case "year":
      return { from: startOfYear(reference), to: endOfYear(reference) };
    case "custom":
      if (!custom?.from || !custom?.to) {
        throw new Error("A custom date range requires both `from` and `to`.");
      }
      return { from: startOfDay(custom.from), to: endOfDay(custom.to) };
  }
}

/** Every calendar month between (and including) `range.from` and `range.to`, as month-start dates. */
export function monthsInRange(range: ResolvedDateRange): Date[] {
  return eachMonthOfInterval({ start: range.from, end: range.to });
}

/** The last `months` calendar months, ending with the month containing `reference`. Used by trend charts (Income, Expenses). */
export function trailingMonthsRange(months: number, reference: Date = new Date()): ResolvedDateRange {
  return { from: startOfMonth(subMonths(reference, months - 1)), to: endOfMonth(reference) };
}

export function isDateRangePeriod(value: unknown): value is DateRangePeriod {
  return typeof value === "string" && (DATE_RANGE_PERIODS as readonly string[]).includes(value);
}
