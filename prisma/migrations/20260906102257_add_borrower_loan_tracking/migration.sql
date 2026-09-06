-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('OPEN', 'PARTIALLY_REPAID', 'REPAID', 'WRITTEN_OFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'LOAN_DISBURSEMENT';
ALTER TYPE "TransactionType" ADD VALUE 'LOAN_REPAYMENT';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "loanId" TEXT;

-- CreateTable
CREATE TABLE "borrowers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "borrowers_userId_idx" ON "borrowers"("userId");

-- CreateIndex
CREATE INDEX "loans_userId_idx" ON "loans"("userId");

-- CreateIndex
CREATE INDEX "loans_borrowerId_idx" ON "loans"("borrowerId");

-- CreateIndex
CREATE INDEX "transactions_loanId_idx" ON "transactions"("loanId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend the transaction shape CHECK constraint to cover the two new
-- loan-related transaction types (design.md D1/D8): LOAN_DISBURSEMENT and
-- LOAN_REPAYMENT require accountId + loanId, and forbid
-- categoryId/sourceAccountId/destinationAccountId/investmentId, same shape
-- rules as the existing INVESTMENT_CONTRIBUTION/INVESTMENT_RETURN case.
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_type_shape_check";

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_type_shape_check" CHECK (
  (
    "type" IN ('INCOME', 'EXPENSE')
    AND "accountId" IS NOT NULL
    AND "categoryId" IS NOT NULL
    AND "sourceAccountId" IS NULL
    AND "destinationAccountId" IS NULL
    AND "investmentId" IS NULL
    AND "loanId" IS NULL
  )
  OR
  (
    "type" = 'TRANSFER'
    AND "accountId" IS NULL
    AND "categoryId" IS NULL
    AND "sourceAccountId" IS NOT NULL
    AND "destinationAccountId" IS NOT NULL
    AND "sourceAccountId" <> "destinationAccountId"
    AND "investmentId" IS NULL
    AND "loanId" IS NULL
  )
  OR
  (
    "type" IN ('INVESTMENT_CONTRIBUTION', 'INVESTMENT_RETURN')
    AND "accountId" IS NOT NULL
    AND "investmentId" IS NOT NULL
    AND "categoryId" IS NULL
    AND "sourceAccountId" IS NULL
    AND "destinationAccountId" IS NULL
    AND "loanId" IS NULL
  )
  OR
  (
    "type" IN ('LOAN_DISBURSEMENT', 'LOAN_REPAYMENT')
    AND "accountId" IS NOT NULL
    AND "loanId" IS NOT NULL
    AND "categoryId" IS NULL
    AND "sourceAccountId" IS NULL
    AND "destinationAccountId" IS NULL
    AND "investmentId" IS NULL
  )
);
