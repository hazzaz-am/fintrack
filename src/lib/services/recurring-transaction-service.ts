import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getOwnedAccountOrThrow } from "@/lib/services/account-service";
import { CategoryService } from "@/lib/services/category-service";
import { resolveCurrentSlot } from "@/lib/recurring-schedule";
import type {
  ConfirmRecurringTransactionInput,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
} from "@/lib/validation/recurring-transaction";

async function getOwnedRecurringTransactionOrThrow(userId: string, id: string) {
  const template = await prisma.recurringTransaction.findUnique({ where: { id } });
  if (!template || template.userId !== userId) {
    throw new AppError("NOT_FOUND", "Recurring transaction not found.");
  }
  return template;
}

export const RecurringTransactionService = {
  async create(userId: string, input: CreateRecurringTransactionInput) {
    await getOwnedAccountOrThrow(userId, input.accountId);
    await CategoryService.getOwnedOfType(userId, input.categoryId, input.type);

    return prisma.recurringTransaction.create({
      data: {
        userId,
        name: input.name,
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate,
        description: input.description,
      },
    });
  },

  // Prospective only (design.md D27): recomputing due slots always reads
  // these current fields, so an edit takes effect from the next unconfirmed
  // slot onward — it never rewrites a Transaction already generated.
  async update(userId: string, id: string, input: UpdateRecurringTransactionInput) {
    const template = await getOwnedRecurringTransactionOrThrow(userId, id);

    if (input.accountId) {
      await getOwnedAccountOrThrow(userId, input.accountId);
    }
    if (input.categoryId) {
      await CategoryService.getOwnedOfType(userId, input.categoryId, template.type);
    }

    return prisma.recurringTransaction.update({
      where: { id },
      data: {
        name: input.name,
        accountId: input.accountId,
        categoryId: input.categoryId,
        amount: input.amount,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate,
        description: input.description,
      },
    });
  },

  async list(userId: string) {
    return prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  // Unconditional, no un-archive path (design.md D28), mirroring
  // AccountService.archive/SavingsGoalService.archive — never touches
  // Transaction rows already generated from this template.
  async archive(userId: string, id: string) {
    await getOwnedRecurringTransactionOrThrow(userId, id);
    return prisma.recurringTransaction.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
  },

  // At most one due slot per template (design.md D26) — the per-template
  // existence check below is O(templates), an explicitly accepted trade-off
  // for this app's scale (design.md Risks).
  async getDueTemplates(userId: string) {
    const templates = await prisma.recurringTransaction.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    const due: Array<(typeof templates)[number] & { slotStart: Date; slotEnd: Date }> = [];
    for (const template of templates) {
      const slot = resolveCurrentSlot(template.startDate, template.frequency, template.endDate);
      if (!slot) continue;

      const confirmed = await prisma.transaction.findFirst({
        where: {
          recurringTransactionId: template.id,
          transactionDate: { gte: slot.slotStart, lt: slot.slotEnd },
        },
        select: { id: true },
      });
      if (confirmed) continue;

      due.push({ ...template, ...slot });
    }

    return due;
  },

  // Confirming is a normal transaction write (design.md D25) — no new
  // TransactionType, so it participates in every existing aggregation
  // (balances, summaries, breakdowns) exactly like a manually entered row.
  async confirm(userId: string, id: string, input: ConfirmRecurringTransactionInput) {
    const template = await getOwnedRecurringTransactionOrThrow(userId, id);
    if (template.status !== "ACTIVE") {
      throw new AppError("VALIDATION_ERROR", "This recurring transaction is no longer active.");
    }

    const slot = resolveCurrentSlot(template.startDate, template.frequency, template.endDate);
    if (!slot) {
      throw new AppError("VALIDATION_ERROR", "This recurring transaction is not currently due.");
    }

    return prisma.$transaction(async (tx) => {
      const alreadyConfirmed = await tx.transaction.findFirst({
        where: {
          recurringTransactionId: template.id,
          transactionDate: { gte: slot.slotStart, lt: slot.slotEnd },
        },
        select: { id: true },
      });
      if (alreadyConfirmed) {
        throw new AppError("CONFLICT", "This recurring transaction has already been confirmed for the current period.");
      }

      return tx.transaction.create({
        data: {
          userId,
          accountId: template.accountId,
          categoryId: template.categoryId,
          recurringTransactionId: template.id,
          type: template.type,
          amount: input.amount ?? template.amount,
          transactionDate: input.transactionDate ?? slot.slotStart,
          description: input.description ?? template.description,
        },
      });
    });
  },
};
