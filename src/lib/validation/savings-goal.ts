import { z } from "zod";
import { zPositiveMoney } from "./money";

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: zPositiveMoney,
  targetDate: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional(),
});

export const allocateSchema = z.object({
  goalId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: zPositiveMoney,
  note: z.string().trim().max(300).optional(),
});

export const moveAllocationSchema = z.object({
  fromGoalId: z.string().cuid(),
  toGoalId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: zPositiveMoney,
  note: z.string().trim().max(300).optional(),
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetAmount: zPositiveMoney.optional(),
  targetDate: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type AllocateInput = z.infer<typeof allocateSchema>;
export type MoveAllocationInput = z.infer<typeof moveAllocationSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
