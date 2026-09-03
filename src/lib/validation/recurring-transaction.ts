import { z } from "zod";
import { zPositiveMoney } from "./money";

export const recurringTransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export const recurringFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

export const createRecurringTransactionSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    accountId: z.string().cuid(),
    categoryId: z.string().cuid(),
    type: recurringTransactionTypeSchema,
    amount: zPositiveMoney,
    frequency: recurringFrequencySchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    description: z.string().trim().max(300).optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export const updateRecurringTransactionSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    accountId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    amount: zPositiveMoney.optional(),
    frequency: recurringFrequencySchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

// Amount/date/description are always overridable at confirm time (recurring-transactions
// spec: "Confirming with an edited amount") — the template's stored values are only defaults.
export const confirmRecurringTransactionSchema = z.object({
  amount: zPositiveMoney.optional(),
  transactionDate: z.coerce.date().optional(),
  description: z.string().trim().max(300).optional(),
});

export type RecurringTransactionType = z.infer<typeof recurringTransactionTypeSchema>;
export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;
export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;
export type ConfirmRecurringTransactionInput = z.infer<typeof confirmRecurringTransactionSchema>;
