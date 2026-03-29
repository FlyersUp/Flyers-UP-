import type { RecurringOccurrenceStatus, RecurringSeriesStatus } from './types';
import { OCCURRENCE_BLOCKING_STATUSES } from './constants';

export function isApprovedSeriesStatus(status: string): boolean {
  return status === 'approved';
}

export function isActiveSeriesForList(status: RecurringSeriesStatus | string): boolean {
  return ['pending', 'approved', 'countered', 'paused'].includes(status);
}

export function occurrenceBlocksAvailability(status: RecurringOccurrenceStatus | string): boolean {
  return (OCCURRENCE_BLOCKING_STATUSES as readonly string[]).includes(status);
}
