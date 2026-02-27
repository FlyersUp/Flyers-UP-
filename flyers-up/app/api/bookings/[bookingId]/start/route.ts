/**
 * POST /api/bookings/[bookingId]/start
 * Pro starts work. Sets status to in_progress, started_at timestamp.
 */
import { NextResponse } from 'next/server';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { transitionBookingStatus } from '@/lib/bookingStatusTransition';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }
  return transitionBookingStatus(id, 'in_progress');
}
