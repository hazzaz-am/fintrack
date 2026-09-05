-- CreateEnum
CREATE TYPE "GoalReservationPromiseStatus" AS ENUM ('OPEN', 'PARTIALLY_RESOLVED', 'RESOLVED', 'WRITTEN_OFF');

-- AlterTable
ALTER TABLE "goal_allocation_events" ADD COLUMN     "promiseId" TEXT,
ADD COLUMN     "sourceTransactionId" TEXT;

-- CreateTable
CREATE TABLE "goal_reservation_promises" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingsGoalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "GoalReservationPromiseStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_reservation_promises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_reservation_promises_userId_idx" ON "goal_reservation_promises"("userId");

-- CreateIndex
CREATE INDEX "goal_reservation_promises_savingsGoalId_idx" ON "goal_reservation_promises"("savingsGoalId");

-- CreateIndex
CREATE INDEX "goal_reservation_promises_accountId_idx" ON "goal_reservation_promises"("accountId");

-- CreateIndex
CREATE INDEX "goal_allocation_events_sourceTransactionId_idx" ON "goal_allocation_events"("sourceTransactionId");

-- CreateIndex
CREATE INDEX "goal_allocation_events_promiseId_idx" ON "goal_allocation_events"("promiseId");

-- AddForeignKey
ALTER TABLE "goal_allocation_events" ADD CONSTRAINT "goal_allocation_events_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_allocation_events" ADD CONSTRAINT "goal_allocation_events_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "goal_reservation_promises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_reservation_promises" ADD CONSTRAINT "goal_reservation_promises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_reservation_promises" ADD CONSTRAINT "goal_reservation_promises_savingsGoalId_fkey" FOREIGN KEY ("savingsGoalId") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_reservation_promises" ADD CONSTRAINT "goal_reservation_promises_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
