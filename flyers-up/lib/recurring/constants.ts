/** Occupation slugs that are strong recurring candidates (expand via recurring_occupations per pro). */
export const RECURRING_FRIENDLY_OCCUPATION_SLUGS = [
  'cleaning',
  'tutoring',
  'dog-walking',
  'babysitting',
  'lawn-care',
  'personal-training',
  'meal-prep',
  'office-cleaning',
  'home-organizing',
  'elder-companion-care',
] as const;

export const DEFAULT_RECURRING_GENERATION_HORIZON_DAYS = 84;

export const RECURRING_SERIES_ACTIVE_STATUSES = ['pending', 'approved', 'countered', 'paused'] as const;

/** Occurrence windows that reserve the pro calendar (incl. reschedule in flight). */
export const OCCURRENCE_BLOCKING_STATUSES = [
  'scheduled',
  'pending_confirmation',
  'confirmed',
  'reschedule_requested',
] as const;

/** Occurrences eligible for upcoming-service reminders (not finished / dead). */
export const OCCURRENCE_REMINDER_ELIGIBLE_STATUSES = [
  'scheduled',
  'pending_confirmation',
  'confirmed',
  'reschedule_requested',
] as const;

/** Bookings that occupy the pro calendar for conflict detection */
export const BOOKING_SCHEDULE_OVERLAP_STATUSES = [
  'deposit_paid',
  'accepted',
  'scheduled',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
] as const;
