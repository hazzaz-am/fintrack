import { z } from "zod";

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: categoryTypeSchema,
  parentCategoryId: z.string().cuid().optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  parentCategoryId: z.string().cuid().nullable().optional(),
  icon: z.string().trim().max(50).nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
