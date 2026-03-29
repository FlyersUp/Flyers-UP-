/**
 * GET / POST /api/pro/blocked-times?from=&to= optional range
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from')?.trim();
  const to = url.searchParams.get('to')?.trim();

  let q = admin
    .from('pro_blocked_times')
    .select('id, start_at, end_at, reason, created_at, updated_at')
    .eq('pro_user_id', user.id)
    .order('start_at', { ascending: true });

  if (from && to) {
    const rangeStart = `${from}T00:00:00.000Z`;
    const rangeEnd = `${to}T23:59:59.999Z`;
    q = q.lt('start_at', rangeEnd).gt('end_at', rangeStart);
  } else if (from) {
    q = q.gt('end_at', `${from}T00:00:00.000Z`);
  } else if (to) {
    q = q.lt('start_at', `${to}T23:59:59.999Z`);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, blocked: data ?? [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  let body: { startAt?: string; endAt?: string; reason?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const startAt = typeof body.startAt === 'string' ? body.startAt.trim() : '';
  const endAt = typeof body.endAt === 'string' ? body.endAt.trim() : '';
  const s = DateTime.fromISO(startAt, { zone: 'utc' });
  const e = DateTime.fromISO(endAt, { zone: 'utc' });
  if (!s.isValid || !e.isValid || e <= s) {
    return NextResponse.json({ ok: false, error: 'startAt and endAt must be valid ISO UTC with end > start' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('pro_blocked_times')
    .insert({
      pro_user_id: user.id,
      start_at: s.toISO(),
      end_at: e.toISO(),
      reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
      created_at: now,
      updated_at: now,
    })
    .select('id, start_at, end_at, reason')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, blocked: data }, { status: 201 });
}
