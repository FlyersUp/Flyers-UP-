import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecurringPreferencesRow, RelationshipSignals } from './types';

export async function getOrCreateRecurringPreferences(
  admin: SupabaseClient,
  proUserId: string
): Promise<RecurringPreferencesRow | null> {
  const { data: existing } = await admin.from('recurring_preferences').select('*').eq('pro_user_id', proUserId).maybeSingle();
  if (existing) return existing as RecurringPreferencesRow;

  const { data: created, error } = await admin
    .from('recurring_preferences')
    .insert({ pro_user_id: proUserId })
    .select('*')
    .maybeSingle();

  if (error) return null;
  return created as RecurringPreferencesRow;
}

export async function loadRelationshipSignals(
  admin: SupabaseClient,
  customerUserId: string,
  proUserId: string
): Promise<RelationshipSignals> {
  const [{ data: fav }, { data: pref }] = await Promise.all([
    admin
      .from('customer_pro_preferences')
      .select('is_favorited')
      .eq('customer_user_id', customerUserId)
      .eq('pro_user_id', proUserId)
      .maybeSingle(),
    admin
      .from('pro_customer_preferences')
      .select('preference_status')
      .eq('pro_user_id', proUserId)
      .eq('customer_user_id', customerUserId)
      .maybeSingle(),
  ]);

  const customerFavoritedPro = fav?.is_favorited === true;
  const st = pref?.preference_status ?? 'standard';
  const proMarkedPreferred = st === 'preferred';
  const proBlockedRecurring = st === 'recurring_blocked';

  return { customerFavoritedPro, proMarkedPreferred, proBlockedRecurring };
}

export async function countApprovedRecurringCustomers(admin: SupabaseClient, proUserId: string): Promise<number> {
  const { data, error } = await admin
    .from('recurring_series')
    .select('customer_user_id')
    .eq('pro_user_id', proUserId)
    .eq('status', 'approved');

  if (error || !data) return 0;
  return new Set(data.map((r) => (r as { customer_user_id: string }).customer_user_id)).size;
}

export async function customerHasApprovedSeries(
  admin: SupabaseClient,
  proUserId: string,
  customerUserId: string
): Promise<boolean> {
  const { data } = await admin
    .from('recurring_series')
    .select('id')
    .eq('pro_user_id', proUserId)
    .eq('customer_user_id', customerUserId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function isOccupationEnabledForRecurring(
  admin: SupabaseClient,
  proUserId: string,
  occupationSlug: string
): Promise<boolean> {
  const { data } = await admin
    .from('recurring_occupations')
    .select('is_enabled')
    .eq('pro_user_id', proUserId)
    .eq('occupation_slug', occupationSlug)
    .maybeSingle();

  if (!data) return true;
  return (data as { is_enabled?: boolean }).is_enabled !== false;
}

export async function loadRecurringWindows(admin: SupabaseClient, proUserId: string) {
  const { data } = await admin.from('recurring_availability_windows').select('*').eq('pro_user_id', proUserId);
  return (data ?? []) as Array<{
    day_of_week: number;
    start_minute: number;
    end_minute: number;
    occupation_slug: string | null;
    recurring_only: boolean;
    is_flexible: boolean;
    is_active: boolean;
  }>;
}
