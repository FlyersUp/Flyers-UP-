/**
 * End-to-end marketplace payment lifecycle against a real Supabase project (service role).
 *
 * Run:
 *   INTEGRATION_TEST=1 npx tsx --test lib/bookings/__tests__/full-payment-lifecycle.test.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.
 * Creates throwaway auth users, a service_pros row, a booking, job_completions, then deletes them.
 *
 * Stripe: real PaymentIntents are not created. Deposit/final webhooks are simulated via
 * {@link handleDepositPaymentSucceeded} / {@link handleFinalPaymentSucceeded}. Connect
 * transfers are stubbed via {@link setCreateTransferForIntegrationTest}.
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import type Stripe from 'stripe';

import {
  finalizeDepositPaymentIntentProvisioning,
  handleDepositPaymentSucceeded,
  handleFinalPaymentSucceeded,
  markBookingCompleted,
  releasePayout,
} from '@/lib/bookings/payment-lifecycle-service';
import { setCreateTransferForIntegrationTest } from '@/lib/stripe/server';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';

const RUN =
  process.env.INTEGRATION_TEST === '1' &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
  Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim());

function mockPaymentIntent(partial: Partial<Stripe.PaymentIntent> & { id: string }): Stripe.PaymentIntent {
  return {
    object: 'payment_intent',
    amount: 0,
    amount_received: 0,
    currency: 'usd',
    metadata: {},
    ...partial,
  } as Stripe.PaymentIntent;
}

describe('integration: full deposit → final → payout lifecycle', { skip: !RUN }, () => {
  const created = {
    customerUserId: '' as string,
    proUserId: '' as string,
    proRowId: '' as string,
    bookingId: '' as string,
    categoryId: '' as string,
  };

  after(async () => {
    setCreateTransferForIntegrationTest(null);
    const admin = createSupabaseAdmin();
    if (created.bookingId) {
      await admin.from('bookings').delete().eq('id', created.bookingId);
    }
    if (created.proRowId) {
      await admin.from('service_pros').delete().eq('id', created.proRowId);
    }
    for (const uid of [created.customerUserId, created.proUserId]) {
      if (uid) {
        await admin.auth.admin.deleteUser(uid);
      }
    }
  });

  it('runs deposit PI → paid → completed → final PI → paid → payout release with consistent rows', async () => {
    const admin = createSupabaseAdmin();
    const suffix = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    const piDeposit = `pi_integration_dep_${suffix}`;
    const piFinal = `pi_integration_final_${suffix}`;
    const transferId = `tr_integration_${suffix}`;

    const { data: cat, error: catErr } = await admin.from('service_categories').select('id').limit(1).maybeSingle();
    if (catErr || !cat?.id) {
      assert.fail(`Need at least one service_categories row: ${catErr?.message ?? 'empty'}`);
    }
    created.categoryId = cat.id as string;

    const customerEmail = `lifecycle.cust.${suffix}@mailinator.com`;
    const proEmail = `lifecycle.pro.${suffix}@mailinator.com`;
    const password = 'TestLifecycle!234';

    const custRes = await admin.auth.admin.createUser({
      email: customerEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'customer' },
    });
    if (custRes.error || !custRes.data.user) assert.fail(custRes.error?.message ?? 'customer create');
    created.customerUserId = custRes.data.user.id;

    const proRes = await admin.auth.admin.createUser({
      email: proEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'pro' },
    });
    if (proRes.error || !proRes.data.user) assert.fail(proRes.error?.message ?? 'pro create');
    created.proUserId = proRes.data.user.id;

    const { error: p1 } = await admin.from('profiles').upsert(
      {
        id: created.customerUserId,
        role: 'customer',
        first_name: 'LCust',
        email: customerEmail,
        onboarding_step: null,
      },
      { onConflict: 'id' }
    );
    assert.ok(!p1, p1?.message);

    const { error: p2 } = await admin.from('profiles').upsert(
      {
        id: created.proUserId,
        role: 'pro',
        first_name: 'LPro',
        zip_code: '10001',
        email: proEmail,
        onboarding_step: null,
      },
      { onConflict: 'id' }
    );
    assert.ok(!p2, p2?.message);

    const { data: proIns, error: proInsErr } = await admin
      .from('service_pros')
      .insert({
        user_id: created.proUserId,
        display_name: `Lifecycle Pro ${suffix}`,
        category_id: created.categoryId,
        service_area_zip: '10001',
        available: true,
        stripe_account_id: 'acct_test_lifecycle',
        stripe_charges_enabled: true,
      })
      .select('id')
      .single();
    if (proInsErr || !proIns?.id) assert.fail(proInsErr?.message ?? 'service_pros insert');
    created.proRowId = proIns.id as string;

    const { data: bookingRow, error: bookErr } = await admin
      .from('bookings')
      .insert({
        customer_id: created.customerUserId,
        pro_id: created.proRowId,
        service_date: '2026-06-15',
        service_time: '10:00',
        address: '100 Integration Test Lane',
        notes: 'full-payment-lifecycle integration',
        status: 'accepted',
        status_history: [{ status: 'requested', at: new Date().toISOString() }],
        currency: 'usd',
        total_amount_cents: 10_000,
        amount_subtotal: 9500,
        subtotal_cents: 9500,
        platform_fee_cents: 500,
        deposit_amount_cents: 2000,
        final_amount_cents: 8000,
        remaining_amount_cents: 8000,
        dispute_status: 'none',
        refund_status: 'none',
        is_multi_day: false,
        payout_blocked: false,
        payout_hold_reason: 'none',
        suspicious_completion: false,
      })
      .select('id')
      .single();
    if (bookErr || !bookingRow?.id) assert.fail(bookErr?.message ?? 'booking insert');
    created.bookingId = bookingRow.id as string;
    const bookingId = created.bookingId;

    // --- 2) Deposit PaymentIntent provisioned (Stripe create mocked away; DB path only)
    await finalizeDepositPaymentIntentProvisioning(admin, {
      bookingId,
      paymentIntentId: piDeposit,
      currency: 'usd',
      amountDepositCents: 2000,
    });
    {
      const { data: row } = await admin
        .from('bookings')
        .select('payment_lifecycle_status, deposit_payment_intent_id, service_status')
        .eq('id', bookingId)
        .single();
      assert.equal(row?.payment_lifecycle_status, 'deposit_pending');
      assert.equal(row?.deposit_payment_intent_id, piDeposit);
      assert.equal(row?.service_status, 'deposit_pending');
    }

    // --- 3) Deposit succeeded (webhook simulation)
    await handleDepositPaymentSucceeded(
      admin,
      mockPaymentIntent({
        id: piDeposit,
        amount: 2000,
        amount_received: 2000,
        currency: 'usd',
        customer: 'cus_integration_test',
        payment_method: null,
        metadata: { booking_id: bookingId },
      })
    );
    {
      const { data: row } = await admin
        .from('bookings')
        .select(
          'payment_lifecycle_status, payment_status, paid_deposit_at, stripe_payment_intent_deposit_id, amount_paid_cents'
        )
        .eq('id', bookingId)
        .single();
      assert.equal(row?.payment_lifecycle_status, 'deposit_paid');
      assert.equal(String(row?.payment_status ?? '').toUpperCase(), 'PAID');
      assert.ok(row?.paid_deposit_at);
      assert.equal(row?.stripe_payment_intent_deposit_id, piDeposit);
      assert.equal(row?.amount_paid_cents, 2000);
    }

    // --- 4) Pro completion + lifecycle “job complete” (review window + final due)
    const completedAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const autoConfirmAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { error: upCompErr } = await admin
      .from('bookings')
      .update({
        status: 'awaiting_remaining_payment',
        arrived_at: completedAt,
        started_at: completedAt,
        completed_at: completedAt,
        auto_confirm_at: autoConfirmAt,
      })
      .eq('id', bookingId);
    assert.ok(!upCompErr, upCompErr?.message);

    const { error: jcErr } = await admin.from('job_completions').insert({
      booking_id: bookingId,
      pro_id: created.proRowId,
      after_photo_urls: [
        'https://cdn.example/__integration__/lifecycle-after-a.jpg',
        'https://cdn.example/__integration__/lifecycle-after-b.jpg',
      ],
    });
    assert.ok(!jcErr, jcErr?.message);

    await markBookingCompleted(admin, { bookingId, completedByUserId: created.proUserId });
    {
      const { data: row } = await admin
        .from('bookings')
        .select('payment_lifecycle_status, service_status, customer_review_deadline_at')
        .eq('id', bookingId)
        .single();
      assert.equal(row?.payment_lifecycle_status, 'final_pending');
      assert.equal(row?.service_status, 'completed');
      assert.ok(row?.customer_review_deadline_at);
    }

    // --- 5) Auto-charge triggered (Stripe PI create not called; mirror in-flight final_processing)
    const reviewPast = new Date(Date.now() - 60_000).toISOString();
    await admin.from('bookings').update({ customer_review_deadline_at: reviewPast }).eq('id', bookingId);
    const { error: procErr } = await admin
      .from('bookings')
      .update({
        payment_lifecycle_status: 'final_processing',
        final_charge_attempted_at: new Date().toISOString(),
        final_payment_intent_id: piFinal,
        stripe_payment_intent_remaining_id: piFinal,
      })
      .eq('id', bookingId);
    assert.ok(!procErr, procErr?.message);
    {
      const { data: row } = await admin
        .from('bookings')
        .select('payment_lifecycle_status, final_payment_intent_id')
        .eq('id', bookingId)
        .single();
      assert.equal(row?.payment_lifecycle_status, 'final_processing');
      assert.equal(row?.final_payment_intent_id, piFinal);
    }

    // --- 6) Final payment succeeded (off-session success / webhook simulation)
    await handleFinalPaymentSucceeded(
      admin,
      mockPaymentIntent({
        id: piFinal,
        amount: 8000,
        amount_received: 8000,
        currency: 'usd',
        metadata: { booking_id: bookingId },
      })
    );
    {
      const { data: row } = await admin
        .from('bookings')
        .select(
          'payment_lifecycle_status, final_payment_intent_id, final_payment_status, paid_remaining_at, payout_blocked'
        )
        .eq('id', bookingId)
        .single();
      assert.equal(row?.final_payment_intent_id, piFinal);
      assert.equal(String(row?.final_payment_status ?? '').toUpperCase(), 'PAID');
      assert.ok(row?.paid_remaining_at);
      assert.equal(row?.payment_lifecycle_status, 'payout_ready');
      assert.equal(row?.payout_blocked, false);
    }

    // --- 7–8) Payout release + mocked Stripe transfer success
    setCreateTransferForIntegrationTest(async () => transferId);
    const out = await releasePayout(admin, { bookingId });
    assert.equal(out.ok, true, `releasePayout failed: ${out.code ?? 'unknown'}`);
    assert.equal(out.transferId, transferId);

    {
      const { data: row } = await admin
        .from('bookings')
        .select('payment_lifecycle_status, payout_released, stripe_transfer_id, payout_transfer_id, payout_status')
        .eq('id', bookingId)
        .single();
      assert.equal(row?.payment_lifecycle_status, 'payout_sent');
      assert.equal(row?.payout_released, true);
      assert.equal(row?.stripe_transfer_id, transferId);
      assert.equal(row?.payout_transfer_id, transferId);
      assert.equal(row?.payout_status, 'succeeded');
    }

    const { data: bp } = await admin.from('booking_payouts').select('stripe_transfer_id, status').eq('booking_id', bookingId).maybeSingle();
    assert.equal(bp?.stripe_transfer_id, transferId);
    assert.equal(bp?.status, 'released');
  });
});
