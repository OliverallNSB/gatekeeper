const SMS_NOTIFY_INTENTS = new Set([
  "emergency",
  "new_customer",
  "existing_customer",
  "appointment",
]);

export function shouldNotifySms(intent: string): boolean {
  return SMS_NOTIFY_INTENTS.has(intent);
}
