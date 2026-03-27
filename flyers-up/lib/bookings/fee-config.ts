export const DEFAULT_SERVICE_FEE_PERCENT = 0.12;
export const DEFAULT_CONVENIENCE_FEE_CENTS = 200;
export const DEFAULT_PROTECTION_FEE_CENTS = 150;

export function getDemandFeeCents(input?: { demandFeeCents?: number | null }): number {
  const raw = Number(input?.demandFeeCents ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.round(raw);
}
