/**
 * GET /api/pro/availability - List pro's availability slots
 * POST /api/pro/availability - Upsert availability (body: { slots: [{ dayOfWeek, startTime, endTime }] })
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: pro } = await supabase
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('pro_availability')
      .select('id, day_of_week, start_time, end_time')
      .eq('pro_id', pro.id)
      .order('day_of_week');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, slots: data ?? [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Pro availability GET error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: pro } = await supabase
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

    let body: { slots?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const slots = Array.isArray(body?.slots) ? body.slots : [];
    const admin = createAdminSupabaseClient();

    await admin.from('pro_availability').delete().eq('pro_id', pro.id);

    for (const s of slots) {
      const dow = Math.max(0, Math.min(6, Math.round(Number(s.dayOfWeek) || 0)));
      const start = typeof s.startTime === 'string' ? s.startTime : '09:00';
      const end = typeof s.endTime === 'string' ? s.endTime : '17:00';
      await admin.from('pro_availability').insert({
        pro_id: pro.id,
        day_of_week: dow,
        start_time: start,
        end_time: end,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Pro availability POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
