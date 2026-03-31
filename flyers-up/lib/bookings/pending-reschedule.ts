/**
 * Pending reschedules live in `reschedule_requests` (status = pending).
 * The booking row keeps the last agreed slot until the other party accepts.
 */

export type PendingRescheduleInfo = {
  id: string;
  proposedServiceDate: string;
  proposedServiceTime: string;
  proposedStartAt: string | null;
  requestedByRole: 'customer' | 'pro';
  message: string | null;
  expiresAt: string | null;
};

export type RescheduleRequestRow = {
  id: string;
  booking_id: string;
  proposed_service_date: string;
  proposed_service_time: string;
  proposed_start_at: string | null;
  requested_by_role: string;
  message: string | null;
  expires_at: string | null;
};

export function mapRescheduleRowToPending(
  row: Record<string, unknown> | null | undefined
): PendingRescheduleInfo | null {
  if (!row || typeof row.id !== 'string') return null;
  const role = row.requested_by_role;
  const requestedByRole = role === 'pro' ? 'pro' : 'customer';
  const date = row.proposed_service_date;
  const time = row.proposed_service_time;
  if (typeof date !== 'string' || typeof time !== 'string') return null;
  return {
    id: row.id,
    proposedServiceDate: date,
    proposedServiceTime: time,
    proposedStartAt: typeof row.proposed_start_at === 'string' ? row.proposed_start_at : null,
    requestedByRole,
    message: typeof row.message === 'string' ? row.message : null,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
  };
}

/** Wall-clock fields to use for calendar / add-to-calendar when a pending request exists. */
export function calendarWallTimesWithPending(
  serviceDate: string,
  serviceTime: string,
  pending: PendingRescheduleInfo | null | undefined
): { serviceDate: string; serviceTime: string } {
  if (!pending) return { serviceDate, serviceTime };
  return {
    serviceDate: pending.proposedServiceDate,
    serviceTime: pending.proposedServiceTime,
  };
}

export function pendingRescheduleLine(p: PendingRescheduleInfo): string {
  return `${p.proposedServiceDate} at ${p.proposedServiceTime}`;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC midnight shifts). */
export function formatWallDateLong(isoDate: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
