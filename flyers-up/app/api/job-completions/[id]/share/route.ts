/**
 * POST /api/job-completions/[id]/share
 * Increment share_count when user shares a job completion flyer.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const completionId = normalizeUuidOrNull(id);
  if (!completionId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: jc } = await admin
    .from('job_completions')
    .select('id, share_count, pro_id, booking_id')
    .eq('id', completionId)
    .maybeSingle();

  if (!jc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const jcTyped = jc as { pro_id: string; booking_id: string };
  const { data: pro } = await admin
    .from('service_pros')
    .select('user_id')
    .eq('id', jcTyped.pro_id)
    .maybeSingle();

  const isPro = pro?.user_id === user.id;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  if (!isPro && !isAdmin) {
    const { data: b } = await admin
      .from('bookings')
      .select('customer_id')
      .eq('id', jcTyped.booking_id)
      .maybeSingle();
    const isCustomer = (b as { customer_id?: string })?.customer_id === user.id;
    if (!isCustomer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await admin
    .from('job_completions')
    .update({ share_count: (jc.share_count ?? 0) + 1 })
    .eq('id', completionId);

  return NextResponse.json({ ok: true });
}
