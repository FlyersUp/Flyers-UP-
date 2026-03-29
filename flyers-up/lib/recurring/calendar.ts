import type { RecurringOccurrenceStatus } from './types';

export type RecurringCalendarEvent = {
  id: string;
  kind: 'recurring_occurrence';
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  recurringSeriesId: string;
  occurrenceStatus: RecurringOccurrenceStatus;
  occupationSlug: string;
  meta: {
    customerUserId: string;
    proUserId: string;
    bookingId: string | null;
  };
};

export function recurringOccurrenceToCalendarEvent(input: {
  occurrenceId: string;
  seriesId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  occupationSlug: string;
  customerUserId: string;
  proUserId: string;
  bookingId: string | null;
  label: string;
}): RecurringCalendarEvent {
  return {
    id: `rec:${input.occurrenceId}`,
    kind: 'recurring_occurrence',
    title: input.label,
    start: input.scheduledStartAt,
    end: input.scheduledEndAt,
    allDay: false,
    recurringSeriesId: input.seriesId,
    occurrenceStatus: input.status as RecurringOccurrenceStatus,
    occupationSlug: input.occupationSlug,
    meta: {
      customerUserId: input.customerUserId,
      proUserId: input.proUserId,
      bookingId: input.bookingId,
    },
  };
}
