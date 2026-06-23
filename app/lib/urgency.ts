const URGENT_KEYWORDS = [
  "urgent",
  "emergency",
  "asap",
  "critical",
  "dying",
  "accident",
  "help",
  "immediate",
  "immediately",
  "crisis",
  "right away",
];

export function isUrgent(text: string): boolean {
  const t = (text || "").toLowerCase();
  return URGENT_KEYWORDS.some((keyword) => t.includes(keyword));
}
