const NAME_PATTERNS = [
  /(?:this is|my name is|i'm|i am)\s+([A-Z][a-z]+)/i,
  /^(?:hi|hello|hey),?\s*(?:this is|i'm|i am|my name is)\s+([A-Z][a-z]+)/i,
  /^([A-Z][a-z]+)\s+(?:here|calling|speaking)/i,
  /(?:it's|its)\s+([A-Z][a-z]+)/i,
];

export function extractCallerName(speech: string): string | null {
  if (!speech) return null;
  for (const pattern of NAME_PATTERNS) {
    const match = speech.match(pattern);
    if (match) return match[1];
  }
  return null;
}
