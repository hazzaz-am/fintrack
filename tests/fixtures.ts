import { prisma } from "@/lib/db";

let userCounter = 0;

export async function createTestUser() {
  userCounter += 1;
  return prisma.user.create({
    data: {
      name: `Test User ${userCounter}`,
      email: `test-user-${userCounter}@example.com`,
      passwordHash: "unused-in-tests",
    },
  });
}

export async function createTestAccount(userId: string, openingBalance = "0.00") {
  return prisma.account.create({
    data: {
      userId,
      name: "Test Account",
      type: "BANK_ACCOUNT",
      openingBalance,
    },
  });
}

export async function createTestCategory(userId: string, type: "INCOME" | "EXPENSE", name = "Test Category") {
  return prisma.category.create({
    data: { userId, name, type },
  });
}

export async function createTestRecurringTransaction(
  userId: string,
  accountId: string,
  categoryId: string,
  overrides: Partial<{
    name: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    startDate: Date;
    endDate: Date | null;
  }> = {}
) {
  return prisma.recurringTransaction.create({
    data: {
      userId,
      accountId,
      categoryId,
      name: overrides.name ?? "Test Recurring Transaction",
      type: overrides.type ?? "EXPENSE",
      amount: overrides.amount ?? "1000.00",
      frequency: overrides.frequency ?? "MONTHLY",
      startDate: overrides.startDate ?? new Date("2026-01-01"),
      endDate: overrides.endDate,
    },
  });
}

export async function createTestInvestment(userId: string, openingPrincipal = "0.00") {
  return prisma.investment.create({
    data: {
      userId,
      name: "Test Investment",
      type: "FDR",
      openingPrincipal,
      startDate: new Date("2026-01-01"),
      status: Number(openingPrincipal) > 0 ? "ACTIVE" : "PLANNED",
    },
  });
}
