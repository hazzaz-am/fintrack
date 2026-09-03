-- Extend the transaction shape CHECK constraint to cover the two new
-- investment-related transaction types (design.md D6): INVESTMENT_CONTRIBUTION
-- and INVESTMENT_RETURN require accountId + investmentId, and forbid
-- categoryId/sourceAccountId/destinationAccountId, same as the existing
-- shape rules for INCOME/EXPENSE/TRANSFER.
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
  )
  OR
  (
    "type" IN ('INVESTMENT_CONTRIBUTION', 'INVESTMENT_RETURN')
    AND "accountId" IS NOT NULL
    AND "investmentId" IS NOT NULL
    AND "categoryId" IS NULL
    AND "sourceAccountId" IS NULL
    AND "destinationAccountId" IS NULL
  )
);
