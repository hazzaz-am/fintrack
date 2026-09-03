export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  FDR: "FDR / Fixed Deposit",
  DPS: "DPS",
  STOCKS: "Stocks",
  BONDS: "Bonds",
  MUTUAL_FUNDS: "Mutual Funds",
  SAVINGS_CERTIFICATE: "Savings Certificate",
  BUSINESS_INVESTMENT: "Business Investment",
  CRYPTOCURRENCY: "Cryptocurrency",
  REAL_ESTATE: "Real Estate",
  OTHER: "Other",
};

export function formatInvestmentType(type: string): string {
  return INVESTMENT_TYPE_LABELS[type] ?? type;
}

export const INVESTMENT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  MATURED: "Matured",
  WITHDRAWN: "Withdrawn",
  CANCELLED: "Cancelled",
};

export function formatInvestmentStatus(status: string): string {
  return INVESTMENT_STATUS_LABELS[status] ?? status;
}
