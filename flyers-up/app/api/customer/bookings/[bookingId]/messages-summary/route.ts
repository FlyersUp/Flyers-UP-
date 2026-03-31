/**
 * GET /api/customer/bookings/[bookingId]/messages-summary
 * Returns unread count, last message preview, and timestamp for the Track booking messaging entry.
 * Unread = pro messages newer than customer's last message (heuristic without read tracking).
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
    .select('id, customer_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Last customer message timestamp (for unread heuristic)
  const { data: lastCustomer } = await admin
    .from('booking_messages')
    .select('created_at')
    .eq('booking_id', id)
    .eq('sender_role', 'customer')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCustomerAt = lastCustomer?.created_at ?? null;

  // Count pro messages newer than last customer message
  let unreadCount = 0;
  if (lastCustomerAt) {
    const { count } = await admin
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', id)
      .eq('sender_role', 'pro')
      .gt('created_at', lastCustomerAt);
    unreadCount = count ?? 0;
  } else {
    const { count } = await admin
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', id)
      .eq('sender_role', 'pro');
    unreadCount = count ?? 0;
  }

  // Last message for preview
  const { data: lastMsg } = await admin
    .from('booking_messages')
    .select('message, created_at, sender_role')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastMessage = lastMsg?.message ?? null;
  const lastMessageAt = lastMsg?.created_at ?? null;
  const lastMessageFromPro = lastMsg?.sender_role === 'pro';

  return NextResponse.json({
    unreadCount: Math.min(unreadCount, 99),
    lastMessage: lastMessage ? String(lastMessage).slice(0, 80) : null,
    lastMessageAt,
    lastMessageFromPro,
    hasUnread: unreadCount > 0,
  });
}
