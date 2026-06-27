export function buildGreeting(businessName?: string | null, assistantName?: string | null): string {
  const name = assistantName || "Sarah";
  const parts: string[] = [];

  if (businessName) {
    parts.push(`Thank you for calling ${businessName}.`);
  } else {
    parts.push(`Thank you for calling.`);
  }

  parts.push(`This is ${name}.`);
  parts.push(`May I ask who's calling and what this is regarding?`);

  return parts.join(" ");
}

export function buildWhitelistGreeting(businessName?: string | null, assistantName?: string | null): string {
  const name = assistantName || "Sarah";

  if (businessName) {
    return `Thank you for calling ${businessName}. This is ${name}. One moment please, I'll connect you right away.`;
  }
  return `This is ${name}. One moment please, I'll connect you right away.`;
}
