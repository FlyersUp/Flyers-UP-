/**
 * POST /api/pros/[proId]/availability/check
 * Body: { date: YYYY-MM-DD, time: HH:mm, durationMinutes?: number }
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isServiceProBookableByCustomers } from '@/lib/pro/pro-bookability';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { assertSlotBookable, proposedBookingUtcWindow } from '@/lib/availability/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  if (!proId?.trim()) {
    return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });
  }

  let body: { date?: string; time?: string; durationMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';
  const durationMinutes = Math.min(
    8 * 60,
    Math.max(15, Math.round(Number(body.durationMinutes ?? 60)) || 60)
  );

  if (!DATE_RE.test(date) || !time) {
    return NextResponse.json({ ok: false, error: 'date and time required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile?.role ?? 'customer') !== 'customer') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: proExists } = await admin.from('service_pros').select('id').eq('id', proId.trim()).maybeSingle();
  if (!proExists?.id) {
    return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 404 });
  }
  const bookable = await isServiceProBookableByCustomers(admin, proId.trim());
  if (!bookable) {
    return NextResponse.json(
      {
        ok: true,
        bookable: false,
        reason: 'unavailable',
        startAtUtc: null,
        endAtUtc: null,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const ctx = await loadComputeContextForProRange(admin, proId.trim(), date, date);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Could not load availability' }, { status: 500 });
  }

  const result = assertSlotBookable(date, time, durationMinutes, ctx);
  const window = proposedBookingUtcWindow(date, time, ctx.zone, durationMinutes);

  return NextResponse.json(
    {
      ok: true,
      bookable: result.ok,
      reason: result.ok ? undefined : result.reason,
      startAtUtc: window?.startUtcIso ?? null,
      endAtUtc: window?.endUtcIso ?? null,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
