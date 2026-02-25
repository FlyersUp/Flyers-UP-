/**
 * Job timeline status types and helpers.
 * Used by JobTimelineCard to render the 5-stage operational timeline.
 */

export type Status =
  | 'BOOKED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED';

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

/**
 * Returns the visual state for a stage given the current job status.
 * - done: stage is before or equal to current (for completed status)
 * - active: this stage is the current one
 * - upcoming: stage is after current
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
      return 'BOOKED';
    case 'accepted':
      return 'ACCEPTED';
    case 'awaiting_payment':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    default:
      return 'BOOKED';
  }
}

/** Build timestamps map from createdAt + optional statusHistory. */
export function buildTimestampsFromBooking(
  createdAt: string,
  statusHistory?: { status: string; at: string }[]
): Partial<Record<Status, string>> {
  const out: Partial<Record<Status, string>> = {};
  if (statusHistory?.length) {
    for (const { status, at } of statusHistory) {
      const s = mapDbStatusToTimeline(status);
      out[s] = at;
    }
  } else if (createdAt) {
    out.BOOKED = createdAt;
  }
  return out;
}
