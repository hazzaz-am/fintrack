-- Enforce the shape of each transaction type at the database level,
-- beyond what Prisma's schema language can express (see prisma/schema.prisma).
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_type_shape_check" CHECK (
  (
    "type" IN ('INCOME', 'EXPENSE')
    AND "accountId" IS NOT NULL
    AND "categoryId" IS NOT NULL
    AND "sourceAccountId" IS NULL
    AND "destinationAccountId" IS NULL
  )
  OR
  (
    "type" = 'TRANSFER'
    AND "accountId" IS NULL
    AND "categoryId" IS NULL
    AND "sourceAccountId" IS NOT NULL
    AND "destinationAccountId" IS NOT NULL
    AND "sourceAccountId" <> "destinationAccountId"
  )
);
