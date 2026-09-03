import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";

beforeEach(async () => {
  // Fast, order-safe reset between tests: TRUNCATE ... CASCADE handles FKs in one shot.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "goal_allocation_events", "savings_goals", "recurring_transactions", "transactions", "investments", "categories", "accounts", "users" RESTART IDENTITY CASCADE;`
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
