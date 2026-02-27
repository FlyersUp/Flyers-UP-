/**
 * POST /api/bookings/[id]/on-the-way
 * Pro indicates they are on the way. Sets status to on_the_way, on_the_way_at timestamp.
 */
import { NextResponse } from 'next/server';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { transitionBookingStatus } from '@/lib/bookingStatusTransition';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
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
  return transitionBookingStatus(bookingId, 'on_the_way');
}
