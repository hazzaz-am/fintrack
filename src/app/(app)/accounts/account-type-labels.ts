export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Bank Account",
  MOBILE_BANKING: "Mobile Banking",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  DIGITAL_WALLET: "Digital Wallet",
  OTHER: "Other",
};

export function formatAccountType(type: string): string {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
