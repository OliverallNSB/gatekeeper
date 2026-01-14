import type { PlanPolicy } from "./types";

export const FREE_POLICY: PlanPolicy = {
  plan: "free",
  limits: {
    maxCategories: 12,
    maxTransactionsPerMonth: 150,
    maxHistoryDays: 90,
  },
  features: {
    canUseCustomDateRange: false,
    canExportCsv: false,
    canExportPdf: false,
    canCreateUnlimitedCategories: false,
  },
};
