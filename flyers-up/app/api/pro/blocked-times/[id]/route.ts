import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

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

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.startAt !== undefined) {
    const s = DateTime.fromISO(String(body.startAt).trim(), { zone: 'utc' });
    if (!s.isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid startAt' }, { status: 400 });
    }
    patch.start_at = s.toISO();
  }
  if (body.endAt !== undefined) {
    const e = DateTime.fromISO(String(body.endAt).trim(), { zone: 'utc' });
    if (!e.isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid endAt' }, { status: 400 });
    }
    patch.end_at = e.toISO();
  }
  if (body.reason !== undefined) {
    patch.reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;
  }

  const { data, error } = await admin
    .from('pro_blocked_times')
    .update(patch)
    .eq('id', id.trim())
    .eq('pro_user_id', user.id)
    .select('id, start_at, end_at, reason')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, blocked: data }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!pro) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const { data, error } = await admin
    .from('pro_blocked_times')
    .delete()
    .eq('id', id.trim())
    .eq('pro_user_id', user.id)
    .select('id');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
