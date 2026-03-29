import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireProService } from '@/lib/recurring/api-auth';
import { generateBookingFromOccurrence } from '@/lib/recurring/occurrence-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pro triggers materialization for one occurrence (idempotent). */
export async function POST(_req: Request, { params }: { params: Promise<{ occurrenceId: string }> }) {
  const { occurrenceId: raw } = await params;
  const occurrenceId = normalizeUuidOrNull(raw);
  if (!occurrenceId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { data: occ } = await admin
    .from('recurring_occurrences')
    .select('pro_user_id')
    .eq('id', occurrenceId)
    .maybeSingle();

  if (!occ || (occ as { pro_user_id: string }).pro_user_id !== pr.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const r = await generateBookingFromOccurrence(admin, occurrenceId);
  if (!r.ok) {
    const status =
      r.code === 'conflict'
        ? 409
        : r.code === 'not_found'
          ? 404
          : r.code === 'series_inactive' || r.code === 'occurrence_ineligible' || r.code === 'occurrence_past' || r.code === 'past_series_end'
            ? 409
            : 400;
    return NextResponse.json({ error: r.message, code: r.code }, { status });
  }

  return NextResponse.json({ ok: true, bookingId: r.bookingId, alreadyExisted: r.alreadyExisted ?? false });
}
