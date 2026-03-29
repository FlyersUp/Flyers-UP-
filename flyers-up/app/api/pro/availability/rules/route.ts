/**
 * GET / PUT /api/pro/availability/rules
 * dayOfWeek: 0=Sunday .. 6=Saturday (JS convention)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RuleInput = { dayOfWeek: number; startTime: string; endTime: string; isAvailable?: boolean };

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const { data, error } = await admin
    .from('pro_availability_rules')
    .select('id, day_of_week, start_time, end_time, is_available')
    .eq('pro_user_id', user.id)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rules: data ?? [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  let body: { rules?: RuleInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const rules = Array.isArray(body?.rules) ? body.rules : [];
  for (const r of rules) {
    const dow = Math.round(Number(r.dayOfWeek));
    if (dow < 0 || dow > 6) {
      return NextResponse.json({ ok: false, error: 'dayOfWeek must be 0–6 (Sun–Sat)' }, { status: 400 });
    }
    const st = typeof r.startTime === 'string' ? r.startTime : '';
    const en = typeof r.endTime === 'string' ? r.endTime : '';
    if (!/^\d{1,2}:\d{2}$/.test(st) || !/^\d{1,2}:\d{2}$/.test(en)) {
      return NextResponse.json({ ok: false, error: 'startTime and endTime must be HH:mm' }, { status: 400 });
    }
    if (st >= en) {
      return NextResponse.json({ ok: false, error: 'endTime must be after startTime' }, { status: 400 });
    }
  }

  const { error: delErr } = await admin.from('pro_availability_rules').delete().eq('pro_user_id', user.id);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  if (rules.length > 0) {
    const now = new Date().toISOString();
    const rows = rules.map((r) => ({
      pro_user_id: user.id,
      day_of_week: Math.round(Number(r.dayOfWeek)),
      start_time: r.startTime,
      end_time: r.endTime,
      is_available: r.isAvailable !== false,
      updated_at: now,
    }));
    const { error: insErr } = await admin.from('pro_availability_rules').insert(rows);
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
