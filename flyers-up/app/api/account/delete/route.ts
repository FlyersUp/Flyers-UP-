import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

/**
 * Permanent account deletion (customers only).
 * See docs/ACCOUNT_DELETION.md for data handling and pro-account policy.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { confirmPhrase?: string };
    if (body.confirmPhrase !== CONFIRM_PHRASE) {
      return NextResponse.json(
        {
          error: `Type the phrase "${CONFIRM_PHRASE}" exactly to confirm.`,
        },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const uid = user.id;

    const { data: profile } = await admin.from('profiles').select('role, stripe_customer_id').eq('id', uid).maybeSingle();

    if (profile?.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted through this flow.' },
        { status: 403 }
      );
    }

    const { data: proRow } = await admin.from('service_pros').select('id').eq('user_id', uid).maybeSingle();
    if (proRow) {
      return NextResponse.json(
        {
          error:
            'Service pro accounts cannot be self-deleted in the app (Stripe Connect, payouts, and tax records). Email support@flyersup.app to close your pro account.',
        },
        { status: 403 }
      );
    }

    const stripeCustomerId =
      profile && typeof (profile as { stripe_customer_id?: string | null }).stripe_customer_id === 'string'
        ? (profile as { stripe_customer_id: string }).stripe_customer_id
        : null;

    const { error: convoErr } = await admin.from('conversations').delete().eq('customer_id', uid);
    if (convoErr) {
      console.error('account/delete: conversations', convoErr);
      return NextResponse.json({ error: 'Could not remove messaging data.' }, { status: 500 });
    }

    const { error: bmErr } = await admin.from('booking_messages').delete().eq('sender_id', uid);
    if (bmErr) {
      console.error('account/delete: booking_messages', bmErr);
      return NextResponse.json({ error: 'Could not remove booking messages.' }, { status: 500 });
    }

    const { error: scrubErr } = await admin
      .from('bookings')
      .update({
        address: '[removed]',
        notes: null,
      })
      .eq('customer_id', uid);

    if (scrubErr) {
      console.error('account/delete: scrub bookings', scrubErr);
      return NextResponse.json({ error: 'Could not scrub booking records.' }, { status: 500 });
    }

    if (stripeCustomerId && stripe) {
      try {
        await stripe.customers.del(stripeCustomerId);
      } catch (e) {
        console.warn('account/delete: Stripe customer del skipped', e);
      }
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(uid);
    if (delAuthErr) {
      console.error('account/delete: auth.admin.deleteUser', delAuthErr);
      return NextResponse.json(
        { error: delAuthErr.message || 'Could not delete auth user.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('account/delete:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
