export type Plan = "free" | "pro";

export type GatekeeperLimits = {
  maxCategories: number;
  maxTransactionsPerMonth: number;
  maxHistoryDays: number;
};

export type GatekeeperFeatures = {
  canUseCustomDateRange: boolean;
  canExportCsv: boolean;
  canExportPdf: boolean;
  canCreateUnlimitedCategories: boolean;
};

export type PlanPolicy = {
  plan: Plan;
  limits: GatekeeperLimits;
  features: GatekeeperFeatures;
};
