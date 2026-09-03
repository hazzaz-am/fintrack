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
