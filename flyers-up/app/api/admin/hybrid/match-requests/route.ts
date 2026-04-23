import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — list match requests for ops queue (admin client). */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from('match_requests')
    .select(
      'id, customer_id, occupation_slug, borough_slug, preferred_time, urgency, notes, status, created_at, matched_pro_id, booking_id'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[admin hybrid match-requests list]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const customerIds = [...new Set((rows ?? []).map((r) => String((r as { customer_id: string }).customer_id)))];
  const profileById = new Map<string, { full_name: string | null; email: string | null }>();
  if (customerIds.length > 0) {
    const { data: profs } = await admin.from('profiles').select('id, full_name, email').in('id', customerIds);
    (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
      profileById.set(String(p.id), { full_name: p.full_name, email: p.email });
    });
  }

  const enriched = (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const cid = String(row.customer_id);
    const p = profileById.get(cid);
    return {
      ...row,
      customer_name: p?.full_name ?? p?.email ?? cid.slice(0, 8),
    };
  });

  return Response.json({ ok: true, requests: enriched });
}
