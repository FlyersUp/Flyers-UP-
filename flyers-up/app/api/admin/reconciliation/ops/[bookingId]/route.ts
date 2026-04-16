/**
 * PATCH /api/admin/reconciliation/ops/[bookingId]
 * Update queue row: assignee, last reviewed, ops note (admin only).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPS_NOTE_MAX = 2000;

type PatchBody = {
  assigned_to?: string | null;
  ops_note?: string | null;
  mark_reviewed?: boolean;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const bookingUuid = normalizeUuidOrNull(bookingId);
  if (!bookingUuid) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: bookingRow } = await admin.from('bookings').select('id').eq('id', bookingUuid).maybeSingle();
  if (!bookingRow) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: existing } = await admin
    .from('booking_money_reconciliation_ops')
    .select('booking_id, assigned_to, last_reviewed_at, ops_note')
    .eq('booking_id', bookingUuid)
    .maybeSingle();

  let assigned_to: string | null = existing?.assigned_to ?? null;
  let last_reviewed_at: string | null = existing?.last_reviewed_at ?? null;
  let ops_note: string | null = existing?.ops_note ?? null;

  if ('assigned_to' in body) {
    const raw = body.assigned_to;
    if (raw === null || raw === '') {
      assigned_to = null;
    } else {
      const uid = normalizeUuidOrNull(raw);
      if (!uid) return NextResponse.json({ error: 'Invalid assigned_to' }, { status: 400 });
      const { data: adm } = await admin.from('profiles').select('id').eq('id', uid).eq('role', 'admin').maybeSingle();
      if (!adm) return NextResponse.json({ error: 'Assignee must be an admin profile' }, { status: 400 });
      assigned_to = uid;
    }
  }

  if ('ops_note' in body) {
    const note = body.ops_note;
    if (note === null || note === '') ops_note = null;
    else {
      const t = String(note);
      if (t.length > OPS_NOTE_MAX) {
        return NextResponse.json({ error: `ops_note max ${OPS_NOTE_MAX} characters` }, { status: 400 });
      }
      ops_note = t;
    }
  }

  if (body.mark_reviewed === true) {
    last_reviewed_at = new Date().toISOString();
  }

  const nowIso = new Date().toISOString();
  const row = {
    booking_id: bookingUuid,
    assigned_to,
    last_reviewed_at,
    ops_note,
    updated_at: nowIso,
  };

  const { error: upErr } = await admin.from('booking_money_reconciliation_ops').upsert(row, { onConflict: 'booking_id' });
  if (upErr) {
    console.warn('[reconciliation-ops] upsert failed', upErr);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
