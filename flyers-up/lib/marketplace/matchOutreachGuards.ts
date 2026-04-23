export const DEFAULT_OUTREACH_CAP = 3;
/** Non-terminal outreach blocks another wave until TTL elapses (no response). */
export const OUTREACH_PENDING_TTL_MS = 45 * 60 * 1000;

const TERMINAL = new Set(['accepted', 'declined', 'no_response']);

export type OutreachLogLite = {
  pro_id: string;
  outreach_status: string;
  sent_at: string;
  responded_at: string | null;
};

function latestOutreachPerPro(rows: OutreachLogLite[]): Map<string, OutreachLogLite> {
  const m = new Map<string, OutreachLogLite>();
  for (const r of rows) {
    const prev = m.get(r.pro_id);
    if (!prev || new Date(r.sent_at).getTime() > new Date(prev.sent_at).getTime()) {
      m.set(r.pro_id, r);
    }
  }
  return m;
}

export function proHasPendingOutreach(row: OutreachLogLite | undefined, now = Date.now()): boolean {
  if (!row) return false;
  if (row.responded_at) return false;
  if (TERMINAL.has(row.outreach_status)) return false;
  return now - new Date(row.sent_at).getTime() < OUTREACH_PENDING_TTL_MS;
}

export function requestHasBlockingPendingOutreach(rows: OutreachLogLite[], now = Date.now()): boolean {
  const latest = latestOutreachPerPro(rows);
  for (const r of latest.values()) {
    if (proHasPendingOutreach(r, now)) return true;
  }
  return false;
}

export function distinctProsContacted(rows: OutreachLogLite[]): number {
  return new Set(rows.map((r) => r.pro_id)).size;
}

/**
 * Next ranked pro for sequential outreach: never double-contact same pro (unique row),
 * respect cap, and wait until no pending outreach is blocking.
 */
export function pickNextOutreachProId(
  rankedProIds: string[],
  outreach: OutreachLogLite[],
  cap: number
): string | null {
  const c = Math.max(1, Math.min(20, cap || DEFAULT_OUTREACH_CAP));
  /** Sequential concierge: do not auto-queue the next pro while any outreach is still in-flight. */
  if (requestHasBlockingPendingOutreach(outreach)) return null;
  if (distinctProsContacted(outreach) >= c) return null;
  const contacted = new Set(outreach.map((o) => o.pro_id));
  for (const id of rankedProIds) {
    if (!contacted.has(id)) return id;
  }
  return null;
}
