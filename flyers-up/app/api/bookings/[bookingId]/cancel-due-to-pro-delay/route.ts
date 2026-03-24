/**
 * POST /api/bookings/[bookingId]/cancel-due-to-pro-delay
 * Customer cancels penalty-free when pro has not arrived within grace period.
 *
 * Uses transaction-safe service: atomic RPC locks row, re-checks all conditions,
 * updates booking + incident + event. Refund and notifications run only after success.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { executeNoShowCancel } from '@/lib/bookings/no-show-cancel-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await executeNoShowCancel(id, user.id);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      status: 'canceled_no_show_pro',
      message: result.message,
    });
  }

  return NextResponse.json(
    { error: result.error },
    { status: result.status }
  );
}
