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
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED';

/** DB status values for the pro progression flow (excluding terminal). */
export const DB_STATUS_ORDER: string[] = [
  'requested',
  'accepted',
  'on_the_way',
  'in_progress',
  'awaiting_payment',
];

/** Ordered list of stages for the timeline (left-to-right flow). */
export const STATUS_ORDER: Status[] = [
  'BOOKED',
  'ACCEPTED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
];

/** Human-readable labels per stage. */
export const STATUS_LABELS: Record<Status, string> = {
  BOOKED: 'Booked',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'On the Way',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export type StageState = 'done' | 'active' | 'upcoming';

/** Next status in API format (ACCEPTED | ON_THE_WAY | IN_PROGRESS | COMPLETED). */
export type NextStatusAction = 'ACCEPTED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Returns the next DB status in the progression, or null if at end.
 * Treats 'pending' as equivalent to 'requested'.
 */
export function getNextDbStatus(currentDbStatus: string): string | null {
  const s = currentDbStatus === 'pending' ? 'requested' : currentDbStatus;
  const idx = DB_STATUS_ORDER.indexOf(s);
  if (idx < 0 || idx >= DB_STATUS_ORDER.length - 1) return null;
  return DB_STATUS_ORDER[idx + 1];
}

/**
 * Returns the next Status (timeline) for the UI, or null if at end.
 */
export function getNextStatus(currentStatus: Status): Status | null {
  const idx = STATUS_ORDER.indexOf(currentStatus);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

/**
 * Validates that nextDbStatus is exactly the next step from currentDbStatus.
 */
export function isValidTransition(currentDbStatus: string, nextDbStatus: string): boolean {
  const next = getNextDbStatus(currentDbStatus);
  return next === nextDbStatus;
}

/**
 * Maps API nextStatus (ACCEPTED|ON_THE_WAY|IN_PROGRESS|COMPLETED) to DB status.
 */
export function apiNextStatusToDb(apiStatus: NextStatusAction): string {
  const map: Record<NextStatusAction, string> = {
    ACCEPTED: 'accepted',
    ON_THE_WAY: 'on_the_way',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'awaiting_payment',
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
      return 'ACCEPTED';
    case 'on_the_way':
      return 'ON_THE_WAY';
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'awaiting_payment':
    case 'completed':
      return 'COMPLETED';
    default:
      return 'BOOKED';
  }
}

/** Booking timestamps from DB columns (optional). */
export interface BookingTimestamps {
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status: string; at: string }[];
}

/** Build timestamps map from booking. Prefers dedicated columns, falls back to statusHistory. */
export function buildTimestampsFromBooking(
  createdAt: string,
  statusHistory?: { status: string; at: string }[],
  dedicated?: { acceptedAt?: string | null; onTheWayAt?: string | null; startedAt?: string | null; completedAt?: string | null }
): Partial<Record<Status, string>> {
  const out: Partial<Record<Status, string>> = {};
  out.BOOKED = createdAt;
  if (dedicated?.acceptedAt) out.ACCEPTED = dedicated.acceptedAt;
  if (dedicated?.onTheWayAt) out.ON_THE_WAY = dedicated.onTheWayAt;
  if (dedicated?.startedAt) out.IN_PROGRESS = dedicated.startedAt;
  if (dedicated?.completedAt) out.COMPLETED = dedicated.completedAt;
  if (statusHistory?.length && Object.keys(out).length < 5) {
    for (const { status, at } of statusHistory) {
      const s = mapDbStatusToTimeline(status);
      if (!out[s]) out[s] = at;
    }
  }
  return out;
}
