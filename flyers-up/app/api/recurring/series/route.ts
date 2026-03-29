/**
 * GET /api/recurring/series — list series for authenticated customer or pro
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireCustomerUser, requireProService } from '@/lib/recurring/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const url = new URL(req.url);
  const as = url.searchParams.get('as')?.trim();

  if (as === 'pro') {
    const pr = await requireProService(admin, supabase);
    if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

    const { data, error } = await admin
      .from('recurring_series')
      .select('*')
      .eq('pro_user_id', pr.userId)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, series: data ?? [] });
  }

  const cu = await requireCustomerUser(supabase);
  if (!cu.ok) return NextResponse.json({ error: cu.error }, { status: cu.status });

  const { data, error } = await admin
    .from('recurring_series')
    .select('*')
    .eq('customer_user_id', cu.userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, series: data ?? [] });
}
