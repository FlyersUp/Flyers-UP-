/**
 * GET / POST full-day blocks (pro_blocked_dates by service_pros.id)
 * DELETE ?date=YYYY-MM-DD
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const { data, error } = await admin
    .from('pro_blocked_dates')
    .select('id, blocked_date, reason')
    .eq('pro_id', pro.id)
    .order('blocked_date', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dates: data ?? [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  let body: { date?: string; reason?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const { error } = await admin.from('pro_blocked_dates').upsert(
    {
      pro_id: pro.id,
      blocked_date: date,
      reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    },
    { onConflict: 'pro_id,blocked_date' }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get('date')?.trim() ?? '';
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'date query YYYY-MM-DD required' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('pro_blocked_dates')
    .delete()
    .eq('pro_id', pro.id)
    .eq('blocked_date', date)
    .select('id');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
