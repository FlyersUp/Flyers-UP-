/**
 * POST /api/admin/bookings/[bookingId]/payment-lifecycle
 * Admin payment recovery & dispute actions (role = admin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { stripe as stripeClient } from '@/lib/stripe';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import {
  runAdminBookingPaymentLifecycleAction,
  type AdminPaymentLifecycleBody,
} from '@/lib/admin/admin-booking-payment-lifecycle-actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: AdminPaymentLifecycleBody;
  try {
    body = (await req.json()) as AdminPaymentLifecycleBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const result = await runAdminBookingPaymentLifecycleAction({
    admin,
    bookingId: id,
    userId: user.id,
    body,
    stripeClient,
  });

  return NextResponse.json(result.json, { status: result.status });
}
