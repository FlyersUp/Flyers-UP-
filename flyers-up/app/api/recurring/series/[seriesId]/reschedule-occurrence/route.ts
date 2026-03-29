import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { findScheduleConflict } from '@/lib/recurring/conflicts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = z
    .object({
      occurrence_id: z.string().uuid(),
      new_start_at: z.string().min(10),
      new_end_at: z.string().min(10),
    })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: occ } = await admin
    .from('recurring_occurrences')
    .select('id, recurring_series_id, pro_user_id, customer_user_id, status')
    .eq('id', parsed.data.occurrence_id)
    .maybeSingle();

  if (!occ || (occ as { recurring_series_id: string }).recurring_series_id !== seriesId) {
    return NextResponse.json({ error: 'Occurrence not found' }, { status: 404 });
  }

  const o = occ as { pro_user_id: string; customer_user_id: string; status: string };
  if (o.pro_user_id !== user.id && o.customer_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: sp } = await admin.from('service_pros').select('id').eq('user_id', o.pro_user_id).maybeSingle();
  const proServiceId = sp?.id as string | undefined;
  if (!proServiceId) return NextResponse.json({ error: 'Pro not found' }, { status: 500 });

  const c = await findScheduleConflict(admin, {
    proServiceId,
    proUserId: o.pro_user_id,
    startUtcIso: parsed.data.new_start_at,
    endUtcIso: parsed.data.new_end_at,
    excludeOccurrenceId: parsed.data.occurrence_id,
  });
  if (c) return NextResponse.json({ error: c.message, code: c.code }, { status: 409 });

  const now = new Date().toISOString();
  const { error } = await admin
    .from('recurring_occurrences')
    .update({
      scheduled_start_at: parsed.data.new_start_at,
      scheduled_end_at: parsed.data.new_end_at,
      status: 'reschedule_requested',
      updated_at: now,
    })
    .eq('id', parsed.data.occurrence_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
