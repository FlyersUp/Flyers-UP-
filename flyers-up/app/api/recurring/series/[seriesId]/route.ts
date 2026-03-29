import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: row, error } = await admin.from('recurring_series').select('*').eq('id', seriesId).maybeSingle();
  if (error || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const r = row as { customer_user_id: string; pro_user_id: string };
  if (r.customer_user_id !== user.id && r.pro_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: occ } = await admin
    .from('recurring_occurrences')
    .select('*')
    .eq('recurring_series_id', seriesId)
    .order('scheduled_start_at', { ascending: true })
    .limit(200);

  return NextResponse.json({ ok: true, series: row, occurrences: occ ?? [] });
}
