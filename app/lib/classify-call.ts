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

// Phrase patterns that indicate a new customer inquiry even when
// no single keyword matches (e.g. "I need a new cleaning service")
const NEW_CUSTOMER_PATTERNS: [string, string][] = [
  ["need", "service"],
  ["need", "cleaning"],
  ["need", "someone"],
  ["need", "help with"],
  ["want", "service"],
  ["want", "cleaning"],
  ["looking for", "service"],
  ["looking for", "cleaning"],
  ["looking for", "someone"],
  ["can i get", "service"],
  ["can i get", "cleaning"],
  ["need", "lawn"],
  ["need", "plumbing"],
  ["need", "repair"],
  ["need", "maintenance"],
];

export function classifyCall(speech: string): string {
  const text = (speech || "").toLowerCase();

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }

  if (NEW_CUSTOMER_PATTERNS.some(([a, b]) => text.includes(a) && text.includes(b))) {
    return "new_customer";
  }

  return "general";
}
