import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { AccountService } from "@/lib/services/account-service";
import { BorrowerService } from "@/lib/services/borrower-service";
import { SavingsGoalService } from "@/lib/services/savings-goal-service";
import { TransactionService } from "@/lib/services/transaction-service";
import { prisma } from "@/lib/db";
import { createTestAccount, createTestBorrower, createTestUser } from "./fixtures";

describe("BorrowerService.disburseLoan", () => {
  it("lends money to a borrower, debiting the source account and creating an OPEN loan", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);

    const { loan, transaction } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: account.id,
      amount: "5000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });

    expect(loan.status).toBe("OPEN");
    expect(transaction.type).toBe("LOAN_DISBURSEMENT");
    expect(transaction.amount.toFixed(2)).toBe("5000.00");
    expect(await AccountService.getBalance(user.id, account.id)).toBe("5000.00");
  });

  it("rejects a loan that would fail the existing insufficient-balance check", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "5000.00");
    const borrower = await createTestBorrower(user.id);

    await expect(
      BorrowerService.disburseLoan(user.id, {
        borrowerId: borrower.id,
        accountId: account.id,
        amount: "50000.00",
        disbursedDate: new Date("2026-09-01"),
        dueDate: new Date("2026-09-15"),
      })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("5000.00");
  });

  it("allows lending exactly the account's unallocated balance", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "50000.00");
    const goal = await SavingsGoalService.create(user.id, { name: "Marriage Fund", targetAmount: "500000.00" });
    await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "40000.00" });
    const borrower = await createTestBorrower(user.id);

    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: account.id,
      amount: "10000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });

    expect(loan.status).toBe("OPEN");
    expect(await AccountService.getBalance(user.id, account.id)).toBe("40000.00");
  });

  it("hard-rejects a loan that would exceed the account's unallocated balance, with no consent path, creating no loan or transaction", async () => {
    const user = await createTestUser();
    const account = await createTestAccount(user.id, "50000.00");
    const goal = await SavingsGoalService.create(user.id, { name: "Marriage Fund", targetAmount: "500000.00" });
    await SavingsGoalService.allocate(user.id, { goalId: goal.id, accountId: account.id, amount: "40000.00" });
    const borrower = await createTestBorrower(user.id);

    await expect(
      BorrowerService.disburseLoan(user.id, {
        borrowerId: borrower.id,
        accountId: account.id,
        amount: "15000.00",
        disbursedDate: new Date("2026-09-01"),
        dueDate: new Date("2026-09-15"),
      })
    ).rejects.toMatchObject({ code: "LOAN_EXCEEDS_UNALLOCATED_BALANCE" });

    expect(await AccountService.getBalance(user.id, account.id)).toBe("50000.00");
    const loans = await prisma.loan.findMany({ where: { borrowerId: borrower.id } });
    expect(loans).toHaveLength(0);
  });
});

describe("BorrowerService.recordRepayment", () => {
  async function disburseTestLoan(userId: string, borrowerId: string, sourceAccountId: string, amount = "5000.00") {
    const { loan } = await BorrowerService.disburseLoan(userId, {
      borrowerId,
      accountId: sourceAccountId,
      amount,
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    return loan;
  }

  it("records a partial repayment to a chosen account, leaving the loan PARTIALLY_REPAID", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const destination = await createTestAccount(user.id, "0.00");
    const borrower = await createTestBorrower(user.id);
    const loan = await disburseTestLoan(user.id, borrower.id, source.id);

    const updated = await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: destination.id,
      amount: "2000.00",
      transactionDate: new Date("2026-09-05"),
    });

    expect(updated.status).toBe("PARTIALLY_REPAID");
    expect(updated.outstanding).toBe("3000.00");
    expect(await AccountService.getBalance(user.id, destination.id)).toBe("2000.00");
    expect(await AccountService.getBalance(user.id, source.id)).toBe("5000.00");
  });

  it("marks a loan REPAID once cumulative repayments cover the full amount", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const loan = await disburseTestLoan(user.id, borrower.id, source.id, "5000.00");

    await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "2000.00",
      transactionDate: new Date("2026-09-05"),
    });
    const final = await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "3000.00",
      transactionDate: new Date("2026-09-10"),
    });

    expect(final.status).toBe("REPAID");
    expect(final.outstanding).toBe("0.00");
  });

  it("rejects a repayment greater than the loan's current outstanding amount", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const loan = await disburseTestLoan(user.id, borrower.id, source.id, "5000.00");

    await expect(
      BorrowerService.recordRepayment(user.id, {
        loanId: loan.id,
        accountId: source.id,
        amount: "5000.01",
        transactionDate: new Date("2026-09-05"),
      })
    ).rejects.toMatchObject({ code: "REPAYMENT_EXCEEDS_OUTSTANDING" });
  });
});

describe("BorrowerService.writeOffLoan", () => {
  it("closes a loan as WRITTEN_OFF, preserving the outstanding amount for record-keeping", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "5000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "2000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const written = await BorrowerService.writeOffLoan(user.id, loan.id);

    expect(written.status).toBe("WRITTEN_OFF");
    expect(written.outstanding).toBe("3000.00");
  });

  it("rejects writing off an already-closed loan", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "1000.00",
      transactionDate: new Date("2026-09-05"),
    });

    await expect(BorrowerService.writeOffLoan(user.id, loan.id)).rejects.toMatchObject({ code: "LOAN_ALREADY_CLOSED" });
  });
});

describe("BorrowerService.updateDueDate", () => {
  it("changes a loan's due date regardless of status", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });

    const newDueDate = new Date("2026-10-01");
    const updated = await BorrowerService.updateDueDate(user.id, loan.id, newDueDate);

    expect(updated.dueDate.toISOString()).toBe(newDueDate.toISOString());
  });
});

describe("BorrowerService overdue derivation", () => {
  it("reports a loan overdue once its due date has passed with a positive outstanding amount", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 10);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: pastDue,
    });

    const loans = await BorrowerService.listLoansForBorrower(user.id, borrower.id);
    const found = loans.find((l) => l.id === loan.id);
    expect(found?.isOverdue).toBe(true);
  });

  it("clears the overdue state once the loan is fully repaid", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 10);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: pastDue,
    });
    await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "1000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const loans = await BorrowerService.listLoansForBorrower(user.id, borrower.id);
    const found = loans.find((l) => l.id === loan.id);
    expect(found?.isOverdue).toBe(false);
  });

  it("clears the overdue state once the loan is written off", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 10);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: pastDue,
    });
    await BorrowerService.writeOffLoan(user.id, loan.id);

    const loans = await BorrowerService.listLoansForBorrower(user.id, borrower.id);
    const found = loans.find((l) => l.id === loan.id);
    expect(found?.isOverdue).toBe(false);
  });
});

describe("BorrowerService.listWithOutstanding", () => {
  it("reports each borrower's aggregate outstanding across all their loans", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "20000.00");
    const borrower = await createTestBorrower(user.id, "Rafi");

    const { loan: loanA } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "3000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "2000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.recordRepayment(user.id, {
      loanId: loanA.id,
      accountId: source.id,
      amount: "3000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const borrowers = await BorrowerService.listWithOutstanding(user.id);
    const found = borrowers.find((b) => b.id === borrower.id);
    expect(found?.totalOutstanding).toBe("2000.00");
  });

  it("excludes a written-off loan's amount from the aggregate — it's no longer expected back", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id, "Rafi");

    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.writeOffLoan(user.id, loan.id);

    const borrowers = await BorrowerService.listWithOutstanding(user.id);
    const found = borrowers.find((b) => b.id === borrower.id);
    expect(found?.totalOutstanding).toBe("0.00");
  });
});

describe("Loan disbursement immutability", () => {
  it("rejects deleting a LOAN_DISBURSEMENT transaction", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { transaction } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });

    await expect(TransactionService.delete(user.id, transaction.id)).rejects.toThrow(AppError);
  });

  it("rejects editing the amount of a LOAN_DISBURSEMENT transaction", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { transaction } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });

    await expect(TransactionService.update(user.id, transaction.id, { amount: "2000.00" })).rejects.toThrow(AppError);
  });
});

describe("Loan transactions excluded from income/expense totals", () => {
  it("excludes LOAN_DISBURSEMENT and LOAN_REPAYMENT from the period summary", async () => {
    const user = await createTestUser();
    const source = await createTestAccount(user.id, "10000.00");
    const borrower = await createTestBorrower(user.id);
    const { loan } = await BorrowerService.disburseLoan(user.id, {
      borrowerId: borrower.id,
      accountId: source.id,
      amount: "1000.00",
      disbursedDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
    });
    await BorrowerService.recordRepayment(user.id, {
      loanId: loan.id,
      accountId: source.id,
      amount: "1000.00",
      transactionDate: new Date("2026-09-05"),
    });

    const summary = await TransactionService.getSummary(user.id, { from: new Date("2026-09-01"), to: new Date("2026-09-30") });
    expect(summary.income).toBe("0.00");
    expect(summary.expense).toBe("0.00");
  });
});
