/**
 * GET /api/customer/recurring/eligibility?pro_id=service_pro_uuid&...optional series params for deep check
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireCustomerUser } from '@/lib/recurring/api-auth';
import { buildEligibilityForNewRequest } from '@/lib/recurring/series-actions';
import { loadRelationshipSignals } from '@/lib/recurring/context';
import { computeMutualPreference } from '@/lib/recurring/eligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const proId = normalizeUuidOrNull(url.searchParams.get('pro_id'));
  if (!proId) return NextResponse.json({ error: 'pro_id required' }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: proRow } = await admin.from('service_pros').select('id, user_id, category_id').eq('id', proId).maybeSingle();
  if (!proRow?.user_id) return NextResponse.json({ error: 'Pro not found' }, { status: 404 });

  const { data: cat } = proRow.category_id
    ? await admin.from('service_categories').select('slug').eq('id', proRow.category_id).maybeSingle()
    : { data: null };
  const occupationSlug = (cat as { slug?: string } | null)?.slug ?? 'cleaning';

  const signals = await loadRelationshipSignals(admin, auth.userId, proRow.user_id as string);
  const mutualPreference = computeMutualPreference(signals);

  const shallow = url.searchParams.get('shallow') === '1';
  if (shallow) {
    return NextResponse.json({ ok: true, signals, mutualPreference });
  }

  const eligibility = await buildEligibilityForNewRequest({
    admin,
    customerUserId: auth.userId,
    proUserId: proRow.user_id as string,
    proServiceId: proId,
    occupationSlug,
    timezone: 'America/New_York',
    startDate: new Date().toISOString().slice(0, 10),
    preferredStartTime: '09:00',
    durationMinutes: 60,
    daysOfWeek: [1],
    frequency: 'weekly',
    intervalCount: 1,
  });

  return NextResponse.json({ ok: true, signals, mutualPreference, eligibility });
}
