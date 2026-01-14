import { getPolicy } from "../permissions/permissions";
import type { Plan } from "../plans";

export function requirePro(plan: Plan | null | undefined, featureName = "This feature") {
  const policy = getPolicy(plan);
  if (!policy.features.canExportCsv && featureName.toLowerCase().includes("export")) {
    // optional: keep message friendlier
  }
  if (policy.plan !== "pro") {
    throw new Error(`${featureName} requires Pro.`);
  }
}
