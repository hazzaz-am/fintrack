export const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function formatFrequency(frequency: string): string {
  return FREQUENCY_LABELS[frequency] ?? frequency;
}
