/**
 * GET /api/pros/[proId]/availability/day?date=YYYY-MM-DD&durationMinutes=60
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { computeSlotsForDay, findNextAvailableSlot } from '@/lib/availability/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  if (!proId?.trim()) {
    return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date')?.trim() ?? '';
  const durationMinutes = Math.min(
    8 * 60,
    Math.max(15, parseInt(url.searchParams.get('durationMinutes') ?? '60', 10) || 60)
  );

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'date=YYYY-MM-DD required' }, { status: 400 });
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
  const { data: pro } = await admin.from('service_pros').select('id, available').eq('id', proId.trim()).maybeSingle();
  if (!pro?.id) {
    return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 404 });
  }
  if ((pro as { available?: boolean }).available === false) {
    return NextResponse.json({
      ok: true,
      date,
      timezone: null,
      slots: [],
      nextAvailable: null,
    });
  }

  const ctx = await loadComputeContextForProRange(admin, proId.trim(), date, date);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Could not load availability' }, { status: 500 });
  }

  const slots = computeSlotsForDay(date, durationMinutes, ctx);
  const nextAvailable =
    slots.length > 0 ? null : findNextAvailableSlot(date, durationMinutes, ctx, ctx.maxAdvanceDays + 1);

  return NextResponse.json(
    {
      ok: true,
      date,
      timezone: ctx.zone,
      durationMinutes,
      slots,
      nextAvailable,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
