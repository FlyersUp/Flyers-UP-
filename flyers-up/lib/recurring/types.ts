import type { RECURRING_FRIENDLY_OCCUPATION_SLUGS } from './constants';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type RecurringSeriesStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'countered'
  | 'paused'
  | 'canceled'
  | 'completed';

export type RecurringOccurrenceStatus =
  | 'scheduled'
  | 'pending_confirmation'
  | 'confirmed'
  | 'completed'
  | 'skipped'
  | 'reschedule_requested'
  | 'canceled';

export type ProCustomerPreferenceStatus = 'standard' | 'preferred' | 'recurring_blocked';

export type RecurringFriendlySlug = (typeof RECURRING_FRIENDLY_OCCUPATION_SLUGS)[number];

export type RelationshipSignals = {
  customerFavoritedPro: boolean;
  proMarkedPreferred: boolean;
  proBlockedRecurring: boolean;
};

export type RecurringPreferencesRow = {
  pro_user_id: string;
  recurring_enabled: boolean;
  max_recurring_customers: number;
  current_recurring_customers: number;
  only_preferred_clients_can_request: boolean;
  require_mutual_preference_for_auto_approval: boolean;
  manual_approval_required: boolean;
  allow_auto_approval_for_mutual_preference: boolean;
  recurring_only_windows_enabled: boolean;
  timezone: string | null;
};

export type CounterProposal = {
  frequency?: RecurringFrequency;
  interval_count?: number;
  days_of_week?: number[];
  preferred_start_time?: string;
  duration_minutes?: number;
  start_date?: string;
  end_date?: string | null;
  timezone?: string;
  pro_note?: string;
};
