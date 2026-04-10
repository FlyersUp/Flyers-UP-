/**
 * Human-readable countdown until auto-charge deadline (review window end).
 * Pure — safe for tests and SSR callers that pass a fixed `nowMs`.
 */
export type AutoChargeCountdownResult = {
  /** Primary line, e.g. "Auto-charging in 18h 12m" */
  primary: string;
  /** Optional second line when deadline has passed on the client */
  secondary?: string;
};

const SOON_MS = 90_000; // < 1.5 min → "available soon"

export function formatAutoChargeCountdown(deadlineMs: number, nowMs: number): AutoChargeCountdownResult {
  if (!Number.isFinite(deadlineMs)) {
    return { primary: 'Auto-charge available soon' };
  }

  const diff = deadlineMs - nowMs;
  if (diff <= 0) {
    return {
      primary: 'Auto-charge due now',
      secondary: 'Awaiting payment processing',
    };
  }

  if (diff < SOON_MS) {
    return { primary: 'Auto-charge available soon' };
  }

  const totalM = Math.floor(diff / 60_000);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;

  if (h >= 1) {
    return { primary: `Auto-charging in ${h}h ${m}m` };
  }
  return { primary: `Auto-charging in ${Math.max(1, totalM)}m` };
}
