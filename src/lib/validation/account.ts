import { z } from "zod";
import { zMoney } from "./money";

export const accountTypeSchema = z.enum([
  "BANK_ACCOUNT",
  "MOBILE_BANKING",
  "CASH",
  "CREDIT_CARD",
  "DIGITAL_WALLET",
  "OTHER",
]);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountTypeSchema,
  institution: z.string().trim().max(120).optional(),
  openingBalance: zMoney.default("0.00"),
  currency: z.string().trim().length(3).default("BDT"),
  description: z.string().trim().max(500).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  type: accountTypeSchema.optional(),
  institution: z.string().trim().max(120).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
