export interface CallAction {
  action: "transfer" | "message" | "block" | "log_only" | "future_schedule" | "future_lead";
  priority: "critical" | "high" | "medium" | "low";
  label: string;
  reason: string;
}

const ACTION_MAP: Record<string, CallAction> = {
  emergency: {
    action: "transfer",
    priority: "critical",
    label: "Immediate Transfer",
    reason: "Emergency call detected",
  },
  appointment: {
    action: "future_schedule",
    priority: "high",
    label: "Scheduling Request",
    reason: "Caller requested an appointment",
  },
  existing_customer: {
    action: "message",
    priority: "high",
    label: "Priority Callback",
    reason: "Existing customer follow-up",
  },
  new_customer: {
    action: "future_lead",
    priority: "medium",
    label: "New Lead",
    reason: "Potential new customer inquiry",
  },
  vendor_sales: {
    action: "log_only",
    priority: "low",
    label: "Message Only",
    reason: "Vendor or sales inquiry",
  },
  spam: {
    action: "block",
    priority: "low",
    label: "Spam",
    reason: "Suspected spam or unwanted call",
  },
  general: {
    action: "message",
    priority: "medium",
    label: "General Message",
    reason: "Standard call — message taken",
  },
};

export function getCallAction(category: string | null): CallAction {
  return ACTION_MAP[category || "general"] || ACTION_MAP.general;
}
