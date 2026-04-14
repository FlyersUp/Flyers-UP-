/**
 * Heuristic detection of off-platform payment or circumvention language in booking chat.
 * Conservative: prefer recall with soft UX over false positives; admin review via audit + DB row.
 */

export type OffPlatformSignalCategory =
  | 'third_party_payment_app'
  | 'direct_or_off_platform_payment'
  | 'external_coordination';

export type OffPlatformMessageScan = {
  signal: OffPlatformSignalCategory | null;
};

const PAYMENT_APP = /\b(venmo|zelle|cash\s*app|cashapp|paypal\.me|paypal\s+me)\b/i;

const OFF_PLATFORM_PAY =
  /\b(pay\s+me\s+directly|pay\s+off[-\s]?platform|off[-\s]?platform|outside\s+the\s+app|outside\s+of\s+the\s+app|not\s+through\s+flyers|bypass\s+the\s+app|cash\s+only|under\s+the\s+table)\b/i;

const EXTERNAL_HANDLE =
  /\b((text|dm|message)\s+me\s+(@|on\s+(insta|ig|whatsapp|signal))|(add|reach)\s+me\s+on\s+(whatsapp|signal|telegram|instagram|ig)|my\s+(whatsapp|telegram)\s+is)\b/i;

export function scanMessageForOffPlatformSignals(message: string): OffPlatformMessageScan {
  const t = String(message ?? '').trim();
  if (t.length < 4) return { signal: null };

  if (PAYMENT_APP.test(t)) {
    return { signal: 'third_party_payment_app' };
  }
  if (OFF_PLATFORM_PAY.test(t)) {
    return { signal: 'direct_or_off_platform_payment' };
  }
  if (EXTERNAL_HANDLE.test(t)) {
    return { signal: 'external_coordination' };
  }
  return { signal: null };
}
