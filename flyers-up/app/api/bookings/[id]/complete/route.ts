/**
 * POST /api/bookings/[id]/complete
 * Pro marks work complete. Sets status to awaiting_payment, completed_at timestamp.
 */
import { NextResponse } from 'next/server';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { transitionBookingStatus } from '@/lib/bookingStatusTransition';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookingId = normalizeUuidOrNull(id);
  if (!bookingId) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }
  return transitionBookingStatus(bookingId, 'awaiting_payment');
}
