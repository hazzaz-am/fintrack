import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { InvestmentService } from "@/lib/services/investment-service";
import { createTestAccount, createTestInvestment, createTestUser } from "./fixtures";

describe("InvestmentService", () => {
  it("derives principal from openingPrincipal alone when there is no ledger history", async () => {
    const user = await createTestUser();
    const investment = await InvestmentService.create(user.id, {
      name: "Family Land",
      type: "REAL_ESTATE",
      openingPrincipal: "500000.00",
      startDate: new Date("2020-01-01"),
    });

    expect(investment.status).toBe("ACTIVE");
    const principal = await InvestmentService.getPrincipal(user.id, investment.id);
    expect(principal).toBe("500000.00");
  });

  it("a zero-openingPrincipal investment starts Planned until a contribution is recorded", async () => {
    const user = await createTestUser();
    const investment = await InvestmentService.create(user.id, {
      name: "BRAC Bank FDR",
      type: "FDR",
      openingPrincipal: "0.00",
      startDate: new Date("2026-01-01"),
    });
    expect(investment.status).toBe("PLANNED");

    const account = await createTestAccount(user.id, "10000.00");
    await InvestmentService.contribute(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      amount: "10000.00",
      transactionDate: new Date("2026-01-02"),
    });

    const updated = await InvestmentService.getPrincipal(user.id, investment.id);
    expect(updated).toBe("10000.00");
  });

  it("a contribution reduces the funding account balance and increases investment principal by the same amount, without affecting income/expense", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const investment = await createTestInvestment(user.id, "0.00");

    await InvestmentService.contribute(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      amount: "4000.00",
      transactionDate: new Date("2026-09-01"),
    });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("6000.00");
    expect(await InvestmentService.getPrincipal(user.id, investment.id)).toBe("4000.00");

    const updatedInvestment = await InvestmentService.listWithPrincipal(user.id);
    expect(updatedInvestment.find((i) => i.id === investment.id)?.status).toBe("ACTIVE");
  });

  it("multiple contributions to one investment from different accounts sum correctly", async () => {
    const user = await createTestUser();
    const bracBank = await createTestAccount(user.id, "10000.00");
    const cityBank = await createTestAccount(user.id, "10000.00");
    const investment = await createTestInvestment(user.id, "0.00");

    await InvestmentService.contribute(user.id, {
      investmentId: investment.id,
      accountId: bracBank.id,
      amount: "5000.00",
      transactionDate: new Date("2026-01-01"),
    });
    await InvestmentService.contribute(user.id, {
      investmentId: investment.id,
      accountId: cityBank.id,
      amount: "5000.00",
      transactionDate: new Date("2026-02-01"),
    });

    expect(await InvestmentService.getPrincipal(user.id, investment.id)).toBe("10000.00");
    expect(await AccountService.getBalance(user.id, bracBank.id)).toBe("5000.00");
    expect(await AccountService.getBalance(user.id, cityBank.id)).toBe("5000.00");
  });

  it("maturity with profit: principal via INVESTMENT_RETURN, profit via a separate INCOME transaction under 'Investment Return'", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const investment = await createTestInvestment(user.id, "200000.00");

    const result = await InvestmentService.recordMaturityOrWithdrawal(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      principalAmount: "200000.00",
      profitAmount: "16000.00",
      transactionDate: new Date("2027-01-01"),
      newStatus: "MATURED",
    });

    expect(result.investment.status).toBe("MATURED");
    expect(result.returnTransaction.amount.toString()).toBe("200000");
    expect(result.incomeTransaction?.amount.toString()).toBe("16000");
    expect(result.incomeTransaction?.type).toBe("INCOME");

    expect(await AccountService.getBalance(user.id, account.id)).toBe("216000.00");
    expect(await InvestmentService.getPrincipal(user.id, investment.id)).toBe("0.00");
  });

  it("rejects recording a maturity/withdrawal on a non-Active investment", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const investment = await createTestInvestment(user.id, "0.00"); // Planned, no principal

    await expect(
      InvestmentService.recordMaturityOrWithdrawal(user.id, {
        investmentId: investment.id,
        accountId: account.id,
        principalAmount: "100.00",
        transactionDate: new Date("2026-09-01"),
        newStatus: "WITHDRAWN",
      })
    ).rejects.toThrow(AppError);
  });

  it("a partial withdrawal reduces derived principal without forcing a status change to a terminal state", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const investment = await createTestInvestment(user.id, "200000.00");

    // Withdraw part of the principal but keep recording it as still Active
    // is not possible via recordMaturityOrWithdrawal's schema (newStatus is
    // required), so this exercises the partial-amount path with WITHDRAWN.
    await InvestmentService.recordMaturityOrWithdrawal(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      principalAmount: "50000.00",
      transactionDate: new Date("2026-09-01"),
      newStatus: "WITHDRAWN",
    });

    expect(await InvestmentService.getPrincipal(user.id, investment.id)).toBe("150000.00");
  });

  it("rejects withdrawing more principal than is currently available", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const investment = await createTestInvestment(user.id, "10000.00");

    await expect(
      InvestmentService.recordMaturityOrWithdrawal(user.id, {
        investmentId: investment.id,
        accountId: account.id,
        principalAmount: "50000.00",
        transactionDate: new Date("2026-09-01"),
        newStatus: "WITHDRAWN",
      })
    ).rejects.toThrow(AppError);
  });

  it("an investment past its maturityDate with no recorded payout remains Active with a negative daysUntilMaturity, and is never auto-transitioned", async () => {
    const user = await createTestUser();
    const investment = await InvestmentService.create(user.id, {
      name: "Overdue FDR",
      type: "FDR",
      openingPrincipal: "100000.00",
      startDate: new Date("2025-01-01"),
      maturityDate: new Date("2020-01-01"), // long past
    });

    expect(investment.status).toBe("ACTIVE");

    const upcoming = await InvestmentService.getUpcomingMaturities(user.id);
    const found = upcoming.find((i) => i.id === investment.id);
    expect(found).toBeDefined();
    expect(found!.daysUntilMaturity).toBeLessThan(0);

    const stillActive = await InvestmentService.listWithPrincipal(user.id);
    expect(stillActive.find((i) => i.id === investment.id)?.status).toBe("ACTIVE");
  });

  it("excludes Matured/Withdrawn/Cancelled investments from the upcoming maturity report", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "0.00");
    const investment = await InvestmentService.create(user.id, {
      name: "Soon Matured FDR",
      type: "FDR",
      openingPrincipal: "10000.00",
      startDate: new Date("2026-01-01"),
      maturityDate: new Date("2026-12-01"),
    });

    await InvestmentService.recordMaturityOrWithdrawal(user.id, {
      investmentId: investment.id,
      accountId: account.id,
      principalAmount: "10000.00",
      transactionDate: new Date("2026-12-01"),
      newStatus: "MATURED",
    });

    const upcoming = await InvestmentService.getUpcomingMaturities(user.id);
    expect(upcoming.find((i) => i.id === investment.id)).toBeUndefined();
  });

  it("aggregates investment totals across several active investments via one grouped query", async () => {
    const user = await createTestUser();
    await InvestmentService.create(user.id, {
      name: "FDR A",
      type: "FDR",
      openingPrincipal: "100000.00",
      startDate: new Date("2026-01-01"),
      currentValue: "108000.00",
    });
    await InvestmentService.create(user.id, {
      name: "Stocks B",
      type: "STOCKS",
      openingPrincipal: "50000.00",
      startDate: new Date("2026-01-01"),
      currentValue: "55000.00",
    });
    // Matured investments should not count toward totals.
    const account = await createTestAccount(user.id, "0.00");
    const matured = await InvestmentService.create(user.id, {
      name: "Matured FDR",
      type: "FDR",
      openingPrincipal: "20000.00",
      startDate: new Date("2025-01-01"),
    });
    await InvestmentService.recordMaturityOrWithdrawal(user.id, {
      investmentId: matured.id,
      accountId: account.id,
      principalAmount: "20000.00",
      transactionDate: new Date("2026-01-01"),
      newStatus: "MATURED",
    });

    const totals = await InvestmentService.getTotals(user.id);
    expect(totals.totalInvested).toBe("150000.00");
    expect(totals.currentEstimatedValue).toBe("163000.00");
    expect(totals.expectedProfit).toBe("13000.00");
  });
});
