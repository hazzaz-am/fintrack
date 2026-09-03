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

export const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "INVESTMENT_CONTRIBUTION",
  "INVESTMENT_RETURN",
] as const;

// Search/sort/pagination for the Transactions ledger screen (transactions-ui
// spec). A superset of dateRangeFilterSchema's `type` enum since the ledger
// displays every transaction type, even though the filter UI only exposes
// Income/Expense/Transfer.
export const transactionSearchSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  accountId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  search: z.string().trim().max(300).optional(),
  sortBy: z.enum(["transactionDate", "amount"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type RecordIncomeOrExpenseInput = z.infer<typeof recordIncomeOrExpenseSchema>;
export type RecordTransferInput = z.infer<typeof recordTransferSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type DateRangeFilterInput = z.infer<typeof dateRangeFilterSchema>;
export type TransactionSearchInput = z.infer<typeof transactionSearchSchema>;
