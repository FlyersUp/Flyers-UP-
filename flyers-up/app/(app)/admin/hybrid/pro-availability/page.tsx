import { ProAvailabilityScreen } from '@/components/hybrid/ProAvailabilityScreen';
import type { ProAvailabilityRow } from '@/lib/hybrid-ui/types';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { boroughLabelFromSlug } from '@/lib/marketplace/nycBoroughs';
import { isProMatchableForCustomerListing } from '@/lib/marketplace/proMatchable';

export const dynamic = 'force-dynamic';

type ServiceProRow = {
  id: string;
  user_id: string;
  occupation_id: string | null;
  display_name: string | null;
  is_verified: boolean | null;
  is_paused: boolean | null;
  is_active_this_week: boolean | null;
  available: boolean | null;
  closed_at: string | null;
  last_confirmed_available_at: string | null;
  last_matched_at: string | null;
  recent_response_score: number | null;
  service_area_mode: string | null;
  service_area_values: string[] | null;
};

function withinHours(iso: string | null | undefined, hours: number): boolean {
  if (!iso) return false;
  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return false;
  return Date.now() - when <= hours * 60 * 60 * 1000;
}

function deriveActivity(row: ServiceProRow): Pick<ProAvailabilityRow, 'activityLabel' | 'activityTone'> {
  if (row.is_paused) return { activityLabel: 'Paused', activityTone: 'muted' };
  if (withinHours(row.last_confirmed_available_at, 24)) return { activityLabel: 'Active today', activityTone: 'good' };
  if (withinHours(row.last_matched_at, 48)) return { activityLabel: 'Matched recently', activityTone: 'good' };
  if (Number(row.recent_response_score ?? 0) >= 0.5) return { activityLabel: 'Responsive', activityTone: 'good' };
  if (row.is_active_this_week) return { activityLabel: 'Active this week', activityTone: 'good' };
  return { activityLabel: 'Quiet 48h', activityTone: 'warn' };
}

function deriveBorough(mode: string | null, values: string[] | null): string {
  if (mode?.toLowerCase() === 'all_nyc') return 'All NYC';
  const first = values?.[0];
  if (!first) return '—';
  return boroughLabelFromSlug(String(first));
}

function neighborhoodSummary(values: string[] | null): string {
  if (!values || values.length === 0) return '—';
  return values.slice(0, 3).join(', ');
}

export default async function AdminProAvailabilityPage() {
  const admin = createAdminSupabaseClient();
  const { data: servicePros, error } = await admin
    .from('service_pros')
    .select(
      'id, user_id, occupation_id, display_name, is_verified, is_paused, is_active_this_week, available, closed_at, last_confirmed_available_at, last_matched_at, recent_response_score, service_area_mode, service_area_values'
    )
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[pro-availability]', error);
  }

  const rows = (servicePros ?? []) as ServiceProRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const occupationIds = [...new Set(rows.map((row) => row.occupation_id).filter(Boolean))];

  const profileById = new Map<string, { name: string; email: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name, email').in('id', userIds);
    for (const raw of profiles ?? []) {
      const row = raw as { id: string; full_name: string | null; email: string | null };
      profileById.set(row.id, {
        name: row.full_name?.trim() || row.email || 'Pro',
        email: row.email || '—',
      });
    }
  }

  const occupationNameById = new Map<string, string>();
  if (occupationIds.length > 0) {
    const { data: occupations } = await admin.from('occupations').select('id, name, slug').in('id', occupationIds);
    for (const raw of occupations ?? []) {
      const row = raw as { id: string; name: string | null; slug: string | null };
      occupationNameById.set(row.id, row.name?.trim() || row.slug || '—');
    }
  }

  const initialRows: ProAvailabilityRow[] = rows.map((row) => {
    const profile = profileById.get(row.user_id);
    const activity = deriveActivity(row);
    return {
      id: row.id,
      name: row.display_name?.trim() || profile?.name || 'Pro',
      email: profile?.email || '—',
      occupation: row.occupation_id ? occupationNameById.get(row.occupation_id) ?? '—' : '—',
      neighborhoods: neighborhoodSummary(row.service_area_values),
      borough: deriveBorough(row.service_area_mode, row.service_area_values),
      verified: Boolean(row.is_verified),
      activityLabel: activity.activityLabel,
      activityTone: activity.activityTone,
      activeThisWeek: Boolean(row.is_active_this_week),
      paused: Boolean(row.is_paused),
      matchable: isProMatchableForCustomerListing({
        is_verified: row.is_verified,
        is_paused: row.is_paused,
        is_active_this_week: row.is_active_this_week,
        available: row.available,
        closed_at: row.closed_at,
        last_confirmed_available_at: row.last_confirmed_available_at,
        last_matched_at: row.last_matched_at,
        recent_response_score: row.recent_response_score,
      }),
    };
  });

  return <ProAvailabilityScreen initialRows={initialRows} />;
}
