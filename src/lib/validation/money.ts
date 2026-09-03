import { z } from "zod";

// Money is always handled as a decimal-safe string end-to-end: input is
// validated then normalized to a fixed 2-decimal string, and Prisma's
// `Decimal` columns take that string directly. Floating-point numbers are
// never used to represent an amount (PRD Rule 5).
const decimalPattern = /^-?\d+(\.\d{1,2})?$/;

function normalize(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

export const zPositiveMoney = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "number" ? value.toString() : value))
  .refine((value) => decimalPattern.test(value), {
    message: "Amount must be a valid decimal with at most 2 decimal places",
  })
  .transform((value) => normalize(value))
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than zero",
  });

export const zMoney = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "number" ? value.toString() : value))
  .refine((value) => decimalPattern.test(value), {
    message: "Amount must be a valid decimal with at most 2 decimal places",
  })
  .transform((value) => normalize(value));
