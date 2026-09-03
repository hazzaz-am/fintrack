import { z } from "zod";
import { zMoney, zPositiveMoney } from "./money";

export const investmentTypeSchema = z.enum([
  "FDR",
  "DPS",
  "STOCKS",
  "BONDS",
  "MUTUAL_FUNDS",
  "SAVINGS_CERTIFICATE",
  "BUSINESS_INVESTMENT",
  "CRYPTOCURRENCY",
  "REAL_ESTATE",
  "OTHER",
]);

export const investmentStatusSchema = z.enum(["PLANNED", "ACTIVE", "MATURED", "WITHDRAWN", "CANCELLED"]);

export const createInvestmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: investmentTypeSchema,
  institution: z.string().trim().max(120).optional(),
  openingPrincipal: zMoney.default("0.00"),
  startDate: z.coerce.date(),
  maturityDate: z.coerce.date().optional(),
  expectedReturnAmount: zMoney.optional(),
  expectedReturnRate: z.coerce.number().min(0).max(100).optional(),
  currentValue: zMoney.optional(),
  notes: z.string().trim().max(500).optional(),
});

// accountId/amount are optional together: omit both to create a Planned
// investment with no ledger history yet (design.md D7's Risk mitigation).
export const createInvestmentWithContributionSchema = createInvestmentSchema
  .extend({
    accountId: z.string().cuid().optional(),
    contributionAmount: zPositiveMoney.optional(),
  })
  .refine((data) => (data.accountId == null) === (data.contributionAmount == null), {
    message: "accountId and contributionAmount must be provided together",
    path: ["contributionAmount"],
  });

export const updateInvestmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  institution: z.string().trim().max(120).nullable().optional(),
  maturityDate: z.coerce.date().nullable().optional(),
  expectedReturnAmount: zMoney.nullable().optional(),
  expectedReturnRate: z.coerce.number().min(0).max(100).nullable().optional(),
  currentValue: zMoney.nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const contributeInvestmentSchema = z.object({
  investmentId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: zPositiveMoney,
  transactionDate: z.coerce.date(),
  description: z.string().trim().max(300).optional(),
});

export const recordMaturityOrWithdrawalSchema = z.object({
  investmentId: z.string().cuid(),
  accountId: z.string().cuid(),
  principalAmount: zPositiveMoney,
  profitAmount: zPositiveMoney.optional(),
  transactionDate: z.coerce.date(),
  newStatus: z.enum(["MATURED", "WITHDRAWN"]),
  description: z.string().trim().max(300).optional(),
});

export type InvestmentType = z.infer<typeof investmentTypeSchema>;
export type InvestmentStatus = z.infer<typeof investmentStatusSchema>;
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type CreateInvestmentWithContributionInput = z.infer<typeof createInvestmentWithContributionSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
export type ContributeInvestmentInput = z.infer<typeof contributeInvestmentSchema>;
export type RecordMaturityOrWithdrawalInput = z.infer<typeof recordMaturityOrWithdrawalSchema>;
