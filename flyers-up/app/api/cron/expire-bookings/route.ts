/**
 * GET /api/cron/expire-bookings
 * Marks overdue unpaid bookings as expired_unpaid.
 * Secured by CRON_SECRET. Call from Vercel Cron or external scheduler.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const auth = authHeader === `Bearer ${CRON_SECRET}` || req.nextUrl.searchParams.get('secret') === CRON_SECRET;

  if (!CRON_SECRET || !auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: overdue, error } = await admin
    .from('bookings')
    .select('id, payment_intent_id, status_history')
    .in('status', ['payment_required', 'accepted'])
    .lt('payment_due_at', now)
    .or('payment_status.is.null,payment_status.neq.PAID');

  if (error) {
    console.error('Cron expire-bookings: query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let expired = 0;
  for (const b of overdue ?? []) {
    const history = Array.isArray(b.status_history) ? b.status_history : [];
    const nextHistory = [...history, { status: 'expired_unpaid', at: now }];

    const { error: updErr } = await admin
      .from('bookings')
      .update({
        status: 'expired_unpaid',
        status_history: nextHistory,
      })
      .eq('id', b.id)
      .in('status', ['payment_required', 'accepted']);

    if (updErr) {
      console.warn('Cron: failed to expire booking', b.id, updErr);
      continue;
    }

    expired++;

    if (b.payment_intent_id && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(b.payment_intent_id);
        if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
          await stripe.paymentIntents.cancel(b.payment_intent_id);
        }
      } catch {
        // Best-effort
      }
    }
  }

  return NextResponse.json({ expired, total: overdue?.length ?? 0 });
}
