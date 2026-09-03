import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CreateCategoryInput } from "@/lib/validation/category";

// Seeded into every new user's category list on registration (design.md Open
// Question: seed-on-registration, not a shared read-only set) so a user's
// categories are always theirs to edit or delete without affecting anyone else.
export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelancing",
  "Investment Return",
  "Bonus",
  "Gift",
  "Rental Income",
  "Other",
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Home",
  "Rent",
  "Electricity",
  "Gas",
  "Internet",
  "Groceries",
  "Mother",
  "Father",
  "Sister",
  "Family Support",
  "Food",
  "Shopping",
  "Transportation",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Loan Payment",
  "Insurance",
  "Bank Fees",
  "Gifts",
  "Charity",
  "Miscellaneous",
] as const;

async function getOwnedCategoryOrThrow(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.userId !== userId) {
    throw new AppError("NOT_FOUND", "Category not found.");
  }
  return category;
}

export const CategoryService = {
  async seedDefaultsForUser(userId: string) {
    await prisma.category.createMany({
      data: [
        ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ userId, name, type: "INCOME" as const })),
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ userId, name, type: "EXPENSE" as const })),
      ],
      skipDuplicates: true,
    });
  },

  async create(userId: string, input: CreateCategoryInput) {
    if (input.parentCategoryId) {
      await getOwnedCategoryOrThrow(userId, input.parentCategoryId);
    }

    return prisma.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        parentCategoryId: input.parentCategoryId,
        icon: input.icon,
      },
    });
  },

  async list(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  },

  /** Used by TransactionService to validate a category belongs to the user and matches the expected type. */
  async getOwnedOfType(userId: string, categoryId: string, type: "INCOME" | "EXPENSE") {
    const category = await getOwnedCategoryOrThrow(userId, categoryId);
    if (category.type !== type) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Category "${category.name}" is a ${category.type} category and cannot be used for a ${type} transaction.`
      );
    }
    return category;
  },
};
