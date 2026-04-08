/** Human-readable booking status for schedule cards (shared customer/pro). */
export function formatCalendarEventStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'deposit_paid') return 'Deposit paid';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'accepted' || lower === 'scheduled') return 'Scheduled';
  if (lower.includes('awaiting')) return 'Awaiting';
  return s.replace(/_/g, ' ');
}
