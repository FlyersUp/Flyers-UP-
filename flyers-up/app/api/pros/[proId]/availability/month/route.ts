/**
 * GET /api/pros/[proId]/availability/month?month=YYYY-MM&durationMinutes=60
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { computeMonthSummaries } from '@/lib/availability/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  if (!proId?.trim()) {
    return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month')?.trim() ?? '';
  const m = month.match(MONTH_RE);
  if (!m) {
    return NextResponse.json({ ok: false, error: 'month=YYYY-MM required' }, { status: 400 });
  }
  const year = parseInt(m[1]!, 10);
  const monthNum = parseInt(m[2]!, 10);
  const durationMinutes = Math.min(
    8 * 60,
    Math.max(15, parseInt(url.searchParams.get('durationMinutes') ?? '60', 10) || 60)
  );

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
      month,
      timezone: null,
      durationMinutes,
      days: [],
    });
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(monthNum)}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const end = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

  const ctx = await loadComputeContextForProRange(admin, proId.trim(), start, end);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Could not load availability' }, { status: 500 });
  }

  const days = computeMonthSummaries(year, monthNum, durationMinutes, ctx);

  return NextResponse.json(
    {
      ok: true,
      proId: proId.trim(),
      month,
      timezone: ctx.zone,
      durationMinutes,
      days,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
