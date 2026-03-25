/**
 * Job timeline status types and helpers.
 * Used by JobTimelineCard to render the 5-stage operational timeline.
 *
 * VALID TRANSITIONS (DB): requested → accepted → on_the_way → in_progress → awaiting_payment
 * (completed is set by payment flow)
 *
 * TIMESTAMP COLUMNS: accepted_at, on_the_way_at, started_at, completed_at, status_updated_at, status_updated_by
 */

export type Status =
  | 'BOOKED'
  | 'AWAITING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAID';

/** DB status values for the pro progression flow (excluding terminal). */
export const DB_STATUS_ORDER: string[] = [
  'requested',
  'accepted',
  'pro_en_route',
  'arrived',
  'in_progress',
  'awaiting_remaining_payment',
];

/** Ordered list of stages for the timeline (left-to-right flow). */
export const STATUS_ORDER: Status[] = [
  'BOOKED',
  'AWAITING_ACCEPTANCE',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'PAID',
];

/** Human-readable labels per stage (customer-facing). */
export const STATUS_LABELS: Record<Status, string> = {
  BOOKED: 'Requested',
  AWAITING_ACCEPTANCE: 'Awaiting acceptance',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'Working',
  COMPLETED: 'Completed',
  PAID: 'Paid',
};

export type StageState = 'done' | 'active' | 'upcoming';

/** Next status in API format (ACCEPTED | ON_THE_WAY | ARRIVED | IN_PROGRESS | COMPLETED). */
export type NextStatusAction = 'ACCEPTED' | 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Normalize DB status for the pro operational chain (requested → accepted → pro_en_route → …).
 * Payment pipeline statuses still show as "Accepted" on the timeline but were missing from
 * DB_STATUS_ORDER, which made isValidTransition reject ON_THE_WAY (409 invalid_transition).
 */
export function normalizeDbStatusForProgression(dbStatus: string): string {
  if (dbStatus === 'pending') return 'requested';
  if (dbStatus === 'on_the_way') return 'pro_en_route';
  if (
    dbStatus === 'payment_required' ||
    dbStatus === 'awaiting_deposit_payment' ||
    dbStatus === 'accepted_pending_payment' ||
    dbStatus === 'deposit_paid'
  ) {
    return 'accepted';
  }
  return dbStatus;
}

/**
 * Returns the next DB status in the progression, or null if at end.
 * Treats 'pending' as equivalent to 'requested'. Maps on_the_way -> pro_en_route.
 * Payment-related accepted-like statuses normalize to accepted (see normalizeDbStatusForProgression).
 */
export function getNextDbStatus(currentDbStatus: string): string | null {
  const s = normalizeDbStatusForProgression(currentDbStatus);
  const idx = DB_STATUS_ORDER.indexOf(s);
  if (idx < 0 || idx >= DB_STATUS_ORDER.length - 1) return null;
  return DB_STATUS_ORDER[idx + 1];
}

/**
 * Returns the next Status for pro PATCH /jobs/.../status (skips display-only AWAITING_ACCEPTANCE).
 */
export function getNextStatus(currentStatus: Status): Status | null {
  const next: Partial<Record<Status, Status>> = {
    BOOKED: 'ACCEPTED',
    AWAITING_ACCEPTANCE: 'ACCEPTED',
    ACCEPTED: 'ON_THE_WAY',
    ON_THE_WAY: 'ARRIVED',
    ARRIVED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    COMPLETED: 'PAID',
  };
  return next[currentStatus] ?? null;
}

/**
 * Validates that nextDbStatus is exactly the next step from currentDbStatus.
 */
export function isValidTransition(currentDbStatus: string, nextDbStatus: string): boolean {
  const next = getNextDbStatus(currentDbStatus);
  return next === nextDbStatus;
}

/**
 * Maps API nextStatus (ACCEPTED|ON_THE_WAY|ARRIVED|IN_PROGRESS|COMPLETED) to DB status.
 */
export function apiNextStatusToDb(apiStatus: NextStatusAction): string {
  const map: Record<NextStatusAction, string> = {
    ACCEPTED: 'accepted',
    ON_THE_WAY: 'pro_en_route',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'awaiting_remaining_payment',
  };
  return map[apiStatus];
}

/**
 * Returns the visual state for a stage given the current job status.
 */
export function getStageState(
  currentStatus: Status,
  stage: Status
): StageState {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stageIdx = STATUS_ORDER.indexOf(stage);

  if (stageIdx < currentIdx) return 'done';
  if (stageIdx === currentIdx) return 'active';
  return 'upcoming';
}

/** Map DB booking status strings to timeline Status (page-layer only). */
export function mapDbStatusToTimeline(dbStatus: string): Status {
  switch (dbStatus) {
    case 'requested':
    case 'pending':
      return 'BOOKED';
    case 'accepted':
    case 'payment_required':
    case 'awaiting_deposit_payment':
    case 'accepted_pending_payment':
    case 'deposit_paid':
      return 'ACCEPTED';
    case 'pro_en_route':
    case 'on_the_way':
      return 'ON_THE_WAY';
    case 'arrived':
      return 'ARRIVED';
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'completed_pending_payment':
    case 'awaiting_payment':
    case 'awaiting_remaining_payment':
    case 'awaiting_customer_confirmation':
    case 'completed':
    case 'review_pending':
      return 'COMPLETED';
    case 'paid':
    case 'fully_paid':
      return 'PAID';
    default:
      return 'BOOKED';
  }
}

export interface BookingTimelinePaymentContext {
  paidAt?: string | null;
  paidDepositAt?: string | null;
  fullyPaidAt?: string | null;
}

/** True when deposit is captured or booking is in deposit_paid, without implying pro acceptance. */
export function isDepositSecuredForTimeline(
  dbStatus: string,
  ctx?: BookingTimelinePaymentContext
): boolean {
  if (dbStatus === 'deposit_paid') return true;
  const fully =
    dbStatus === 'paid' || dbStatus === 'fully_paid' || Boolean(ctx?.fullyPaidAt);
  if (fully) return true;
  if (ctx?.paidDepositAt) return true;
  if (ctx?.paidAt && !ctx?.fullyPaidAt && dbStatus !== 'paid' && dbStatus !== 'fully_paid') return true;
  return false;
}

/**
 * Timeline display status: merges operational DB status with deposit/payment so the job timeline
 * does not stay on "Requested" after the customer has secured the deposit while the pro has not accepted yet.
 */
export function deriveTimelineDisplayStatus(
  dbStatus: string,
  ctx?: BookingTimelinePaymentContext
): Status {
  const preAccept = dbStatus === 'requested' || dbStatus === 'pending';
  const fully =
    dbStatus === 'paid' || dbStatus === 'fully_paid' || Boolean(ctx?.fullyPaidAt);
  if (preAccept && !fully && isDepositSecuredForTimeline(dbStatus, ctx)) {
    return 'AWAITING_ACCEPTANCE';
  }
  return mapDbStatusToTimeline(dbStatus);
}

/** Booking timestamps from DB columns (optional). */
export interface BookingTimestamps {
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  paidAt?: string | null;
  statusHistory?: { status: string; at: string }[];
}

/** Build timestamps map from booking. Prefers dedicated columns, falls back to statusHistory. */
export function buildTimestampsFromBooking(
  createdAt: string,
  statusHistory?: { status: string; at: string }[],
  dedicated?: { acceptedAt?: string | null; onTheWayAt?: string | null; enRouteAt?: string | null; arrivedAt?: string | null; startedAt?: string | null; completedAt?: string | null; paidAt?: string | null }
): Partial<Record<Status, string>> {
  const out: Partial<Record<Status, string>> = {};
  out.BOOKED = createdAt;
  if (dedicated?.acceptedAt) out.ACCEPTED = dedicated.acceptedAt;
  const enRoute = dedicated?.enRouteAt ?? dedicated?.onTheWayAt;
  if (enRoute) out.ON_THE_WAY = enRoute;
  if (dedicated?.arrivedAt) out.ARRIVED = dedicated.arrivedAt;
  if (dedicated?.startedAt) out.IN_PROGRESS = dedicated.startedAt;
  if (dedicated?.completedAt) out.COMPLETED = dedicated.completedAt;
  if (dedicated?.paidAt) out.PAID = dedicated.paidAt;
  if (statusHistory?.length && Object.keys(out).length < 6) {
    for (const { status, at } of statusHistory) {
      const s = mapDbStatusToTimeline(status);
      if (!out[s]) out[s] = at;
    }
  }
  return out;
}
