import { z } from "zod";
import { zPositiveMoney } from "./money";

export const recordIncomeOrExpenseSchema = z.object({
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  amount: zPositiveMoney,
  transactionDate: z.coerce.date(),
  description: z.string().trim().max(300).optional(),
});

export const recordTransferSchema = z
  .object({
    sourceAccountId: z.string().cuid(),
    destinationAccountId: z.string().cuid(),
    amount: zPositiveMoney,
    transactionDate: z.coerce.date(),
    description: z.string().trim().max(300).optional(),
  })
  .refine((data) => data.sourceAccountId !== data.destinationAccountId, {
    message: "Source and destination accounts must differ",
    path: ["destinationAccountId"],
  });

export const updateTransactionSchema = z.object({
  categoryId: z.string().cuid().optional(),
  amount: zPositiveMoney.optional(),
  transactionDate: z.coerce.date().optional(),
  description: z.string().trim().max(300).nullable().optional(),
});

export const dateRangeFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  accountId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
});

export type RecordIncomeOrExpenseInput = z.infer<typeof recordIncomeOrExpenseSchema>;
export type RecordTransferInput = z.infer<typeof recordTransferSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type DateRangeFilterInput = z.infer<typeof dateRangeFilterSchema>;
