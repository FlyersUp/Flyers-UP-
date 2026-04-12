/**
 * GET /api/admin/payout-review
 * List pending payout review queue items for admin.
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { PAYOUT_REVIEW_QUEUE_OPEN_STATUSES } from '@/lib/admin/payout-review-queue-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminSupabaseClient();

  const { data: queue, error } = await admin
    .from('payout_review_queue')
    .select('id, booking_id, reason, details, status, created_at')
    .in('status', [...PAYOUT_REVIEW_QUEUE_OPEN_STATUSES])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin/payout-review]', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }

  const bookingIds = [...new Set((queue ?? []).map((q) => q.booking_id).filter(Boolean))];
  if (bookingIds.length === 0) {
    return NextResponse.json({ items: [], bookings: {}, pros: {}, customers: {}, categories: {}, reliability: {} });
  }

  const { data: bookings } = await admin
    .from('bookings')
    .select('id, pro_id, customer_id, status, service_date, service_time, created_at, completed_at, suspicious_completion, suspicious_completion_reason, minimum_expected_duration_minutes')
    .in('id', bookingIds);

  const bookingMap = new Map((bookings ?? []).map((b) => [b.id, b]));
  const proIds = [...new Set((bookings ?? []).map((b) => b.pro_id).filter(Boolean))];
  const customerIds = [...new Set((bookings ?? []).map((b) => b.customer_id).filter(Boolean))];

  const { data: pros } = await admin
    .from('service_pros')
    .select('id, display_name, user_id, category_id')
    .in('id', proIds);
  const proMap = new Map((pros ?? []).map((p) => [p.id, p]));

  const { data: customers } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', customerIds);
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  const categoryIds = [...new Set((pros ?? []).map((p) => p.category_id).filter(Boolean))];
  const { data: categories } = await admin
    .from('service_categories')
    .select('id, name, slug')
    .in('id', categoryIds);
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  const { data: reliability } = await admin
    .from('pro_reliability')
    .select('pro_id, reliability_score')
    .in('pro_id', proIds);
  const reliabilityMap = new Map((reliability ?? []).map((r) => [r.pro_id, r.reliability_score]));

  const { data: completions } = await admin
    .from('job_completions')
    .select('booking_id, before_photo_urls, after_photo_urls')
    .in('booking_id', bookingIds);
  const completionMap = new Map((completions ?? []).map((c) => [c.booking_id, c]));

  const { data: milestoneRows } = await admin
    .from('booking_milestones')
    .select('booking_id, milestone_index, title, status, confirmation_source, dispute_open')
    .in('booking_id', bookingIds)
    .order('milestone_index', { ascending: true });

  type MsRow = {
    booking_id: string;
    milestone_index: number;
    title: string;
    status: string;
    confirmation_source: string | null;
    dispute_open: boolean;
  };

  const milestonesByBooking = new Map<string, MsRow[]>();
  for (const row of (milestoneRows ?? []) as MsRow[]) {
    const list = milestonesByBooking.get(row.booking_id) ?? [];
    list.push(row);
    milestonesByBooking.set(row.booking_id, list);
  }

  const items = (queue ?? []).map((q) => {
    const b = bookingMap.get(q.booking_id);
    const pro = b ? proMap.get(b.pro_id) : null;
    const customer = b ? customerMap.get(b.customer_id) : null;
    const cat = pro ? categoryMap.get(pro.category_id) : null;
    const rel = b ? reliabilityMap.get(b.pro_id) : null;
    const jc = completionMap.get(q.booking_id);
    const beforeCount = Array.isArray((jc as { before_photo_urls?: string[] })?.before_photo_urls)
      ? (jc as { before_photo_urls: string[] }).before_photo_urls.filter((u) => u && String(u).length > 5).length
      : 0;
    const afterCount = Array.isArray((jc as { after_photo_urls?: string[] })?.after_photo_urls)
      ? (jc as { after_photo_urls: string[] }).after_photo_urls.filter((u) => u && String(u).length > 5).length
      : 0;

    const rawMs = milestonesByBooking.get(q.booking_id) ?? [];
    const milestones = rawMs.map((m) => ({
      milestone_index: m.milestone_index,
      title: m.title,
      status: m.status,
      confirmation_source: m.confirmation_source,
      dispute_open: m.dispute_open,
    }));

    return {
      ...q,
      booking: b,
      proName: pro?.display_name ?? '—',
      customerName: customer?.full_name ?? customer?.email ?? '—',
      categoryName: cat?.name ?? cat?.slug ?? '—',
      reliabilityScore: rel ?? null,
      evidenceCounts: { before: beforeCount, after: afterCount },
      milestones,
    };
  });

  return NextResponse.json({ items });
}
