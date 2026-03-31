/**
 * Best-effort per-instance fixed window limiter for Edge middleware.
 * For multi-region production, prefer Upstash / Redis; this caps abuse per lambda instance.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const MAX_KEYS = 50_000;

function pruneExpired(): void {
  if (store.size < MAX_KEYS) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
    if (store.size < MAX_KEYS * 0.8) break;
  }
}

export function checkFixedWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  pruneExpired();
  const now = Date.now();
  let b = store.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}
