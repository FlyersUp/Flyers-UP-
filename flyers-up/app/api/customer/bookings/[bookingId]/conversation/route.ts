/**
 * GET /api/customer/bookings/[bookingId]/conversation
 * Returns the conversationId for the customer+pro pair of this booking, if one exists.
 * Used to redirect booking-based chat to the unified conversation thread.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!booking || !booking.pro_id) {
    return NextResponse.json({ conversationId: null });
  }

  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('customer_id', booking.customer_id)
    .eq('pro_id', booking.pro_id)
    .maybeSingle();

  return NextResponse.json({
    conversationId: conv?.id ?? null,
  });
}
