import { describe, expect, it } from "vitest";
import { recordIncomeOrExpenseSchema } from "@/lib/validation/transaction";
import { createInvestmentSchema } from "@/lib/validation/investment";

describe("zPastOrPresentDate (transactionDate/startDate bound)", () => {
  it("rejects a transactionDate one week in the future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);

    const result = recordIncomeOrExpenseSchema.safeParse({
      accountId: "clx0000000000000000000000",
      categoryId: "clx0000000000000000000000",
      amount: "100.00",
      transactionDate: future,
    });

    expect(result.success).toBe(false);
  });

  it("accepts today and any date in the past", () => {
    const result = recordIncomeOrExpenseSchema.safeParse({
      accountId: "clx0000000000000000000000",
      categoryId: "clx0000000000000000000000",
      amount: "100.00",
      transactionDate: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("rejects a future investment startDate but leaves maturityDate unrestricted", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);

    const badStart = createInvestmentSchema.safeParse({
      name: "FDR",
      type: "FDR",
      startDate: future,
    });
    expect(badStart.success).toBe(false);

    const futureMaturity = createInvestmentSchema.safeParse({
      name: "FDR",
      type: "FDR",
      startDate: new Date("2026-01-01"),
      maturityDate: future,
    });
    expect(futureMaturity.success).toBe(true);
  });
});
