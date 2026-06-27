const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["emergency", [
    "emergency", "urgent", "leak", "water leak", "fire", "flood",
    "broken", "immediately", "right now", "asap", "critical",
    "dying", "accident", "crisis",
  ]],
  ["spam", [
    "warranty", "loan", "credit card", "insurance offer", "final notice",
    "social security", "irs", "won a prize", "congratulations you",
  ]],
  ["appointment", [
    "appointment", "schedule", "book", "availability", "reschedule",
    "cancel appointment", "reservation",
  ]],
  ["vendor_sales", [
    "marketing", "seo", "advertising", "partnership", "offer",
    "promotion", "vendor", "sales pitch", "selling",
  ]],
  ["existing_customer", [
    "my job", "my project", "my appointment", "invoice", "payment",
    "following up", "follow up", "you came", "last visit",
    "called before", "returning call", "callback", "my account", "my order",
  ]],
  ["new_customer", [
    "estimate", "quote", "pricing", "new service", "looking for",
    "interested in", "new client", "new customer", "how much",
  ]],
];

export function classifyCall(speech: string): string {
  const text = (speech || "").toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "general";
}
