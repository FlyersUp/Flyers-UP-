function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function resolveUrgency(input: {
  requestedAt?: string | null;
  scheduledStartAt?: string | null;
  now?: Date;
}): 'scheduled' | 'same_day' | 'asap' {
  const now = input.now ?? new Date();
  const requested = toDate(input.requestedAt) ?? now;
  const scheduled = toDate(input.scheduledStartAt);
  if (!scheduled) return 'scheduled';

  const requestedDay = startOfDay(requested).getTime();
  const scheduledDay = startOfDay(scheduled).getTime();
  if (scheduledDay > requestedDay) return 'scheduled';
  if (scheduledDay < requestedDay) return 'asap';

  const hoursUntil = (scheduled.getTime() - requested.getTime()) / (60 * 60 * 1000);
  if (hoursUntil <= 2) return 'asap';
  return 'same_day';
}
