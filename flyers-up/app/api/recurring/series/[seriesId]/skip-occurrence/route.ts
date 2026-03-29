import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

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
      skip_reason: z.string().max(500).optional(),
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
  if (!['scheduled', 'pending_confirmation', 'reschedule_requested'].includes(o.status)) {
    return NextResponse.json({ error: 'Cannot skip this occurrence' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('recurring_occurrences')
    .update({ status: 'skipped', skip_reason: parsed.data.skip_reason ?? null, updated_at: now })
    .eq('id', parsed.data.occurrence_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
