import { z } from "zod";
import { zPositiveMoney } from "./money";
import { zPastOrPresentDate } from "./date";

export const createBorrowerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional(),
});

export const updateBorrowerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const disburseLoanSchema = z.object({
  borrowerId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: zPositiveMoney,
  disbursedDate: zPastOrPresentDate,
  // Forward-looking, like Investment.maturityDate/SavingsGoal.targetDate — not restricted to past-or-present.
  dueDate: z.coerce.date(),
  description: z.string().trim().max(300).optional(),
});

export const recordRepaymentSchema = z.object({
  loanId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: zPositiveMoney,
  transactionDate: zPastOrPresentDate,
  description: z.string().trim().max(300).optional(),
});

export const updateLoanDueDateSchema = z.object({
  dueDate: z.coerce.date(),
});

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>;
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>;
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;
export type RecordRepaymentInput = z.infer<typeof recordRepaymentSchema>;
export type UpdateLoanDueDateInput = z.infer<typeof updateLoanDueDateSchema>;
