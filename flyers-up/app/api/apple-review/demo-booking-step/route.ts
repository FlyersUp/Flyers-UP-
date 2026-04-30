/**
 * Apple Review Demo Mode (reviewer@flyersup.app only)
 * POST — advance demo booking one step (deposit → en route → in progress → completed).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';
import { advanceAppleReviewDemoBooking } from '@/lib/appReviewDemoBooking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { bookingId?: string };
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    if (!bookingId) {
      return NextResponse.json({ ok: false, error: 'bookingId required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email || !isAppleAppReviewAccountEmail(user.email)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const result = await advanceAppleReviewDemoBooking(admin, {
      bookingId,
      reviewerUserId: user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (e) {
    console.error('[apple-review/demo-booking-step]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
