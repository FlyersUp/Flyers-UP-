/**
 * GET / PUT /api/pro/availability/settings
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULTS = {
  timezone: 'America/New_York',
  slot_interval_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  min_notice_minutes: 60,
  max_advance_days: 60,
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const { data } = await admin
    .from('pro_availability_settings')
    .select(
      'timezone, slot_interval_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, max_advance_days'
    )
    .eq('pro_user_id', user.id)
    .maybeSingle();

  return NextResponse.json(
    {
      ok: true,
      settings: { ...DEFAULTS, ...(data ?? {}) },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
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

  let body: Partial<typeof DEFAULTS & { timezone?: string | null }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const timezone =
    typeof body.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim()
      : DEFAULTS.timezone;
  if (!DateTime.now().setZone(timezone).isValid) {
    return NextResponse.json({ ok: false, error: 'Invalid timezone' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('pro_availability_settings')
    .select('created_at')
    .eq('pro_user_id', user.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const row = {
    pro_user_id: user.id,
    timezone,
    slot_interval_minutes: Math.min(
      240,
      Math.max(5, Math.round(Number(body.slot_interval_minutes ?? DEFAULTS.slot_interval_minutes)))
    ),
    buffer_before_minutes: Math.min(
      240,
      Math.max(0, Math.round(Number(body.buffer_before_minutes ?? DEFAULTS.buffer_before_minutes)))
    ),
    buffer_after_minutes: Math.min(
      240,
      Math.max(0, Math.round(Number(body.buffer_after_minutes ?? DEFAULTS.buffer_after_minutes)))
    ),
    min_notice_minutes: Math.min(
      10080,
      Math.max(0, Math.round(Number(body.min_notice_minutes ?? DEFAULTS.min_notice_minutes)))
    ),
    max_advance_days: Math.min(
      365,
      Math.max(1, Math.round(Number(body.max_advance_days ?? DEFAULTS.max_advance_days)))
    ),
    updated_at: now,
    created_at: (existing as { created_at?: string } | null)?.created_at ?? now,
  };

  const { error } = await admin.from('pro_availability_settings').upsert(row, { onConflict: 'pro_user_id' });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
