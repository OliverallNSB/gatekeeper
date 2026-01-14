import { FREE_POLICY, PRO_POLICY, type Plan, type PlanPolicy } from "../plans";

export function getPolicy(plan: Plan | null | undefined): PlanPolicy {
  if (plan === "pro") return PRO_POLICY;
  return FREE_POLICY;
}

export function isPro(plan: Plan | null | undefined): boolean {
  return plan === "pro";
}
