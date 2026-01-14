import type { PlanPolicy } from "./types";

export const PRO_POLICY: PlanPolicy = {
  plan: "pro",
  limits: {
    maxCategories: Number.POSITIVE_INFINITY,
    maxTransactionsPerMonth: Number.POSITIVE_INFINITY,
    maxHistoryDays: 3650, // ~10 years
  },
  features: {
    canUseCustomDateRange: true,
    canExportCsv: true,
    canExportPdf: true,
    canCreateUnlimitedCategories: true,
  },
};
