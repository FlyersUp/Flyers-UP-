/**
 * End-to-end marketplace payment lifecycle against a real Supabase project (service role).
 *
 * Run:
 *   INTEGRATION_TEST=1 npx tsx --test lib/bookings/__tests__/full-payment-lifecycle.test.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.
 * Creates throwaway auth users, a service_pros row, bookings, job_completions, then deletes them.
 *
 * Stripe: real PaymentIntents are not created. Deposit/final webhooks are simulated via
 * {@link handleDepositPaymentSucceeded} / {@link handleFinalPaymentSucceeded}. Connect
 * transfers are stubbed via {@link setCreateTransferForIntegrationTest}.
 *
 * Cron parity: {@link runPayoutReleaseCron} uses the same booking prefilter as production
 * GET /api/cron/bookings/payout-release. After a successful auto-release, {@link findStuckPayoutBookings}
 * must not treat the booking as stuck. With {@link requires_admin_review} = true, the cron skips the
 * row; eligibility snapshot explains the hold (not a silent stuck miss).
 *
 * Metadata parity: after final paid, `assertCanonicalStripeMetadataContractsFromBookingRow` rebuilds
 * deposit/final PaymentIntent metadata and Connect transfer metadata from the frozen `bookings` row
 * using the same builders as production so canonical Stripe keys stay aligned end-to-end.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  finalizeDepositPaymentIntentProvisioning,
  handleDepositPaymentSucceeded,
  handleFinalPaymentSucceeded,
  markBookingCompleted,
  releasePayout,
} from '@/lib/bookings/payment-lifecycle-service';
import { getPayoutReleaseEligibilitySnapshot } from '@/lib/bookings/payout-release-eligibility-snapshot';
import { payoutReleaseCronCandidateOrFilter } from '@/lib/bookings/payout-release-cron-selection';
import { runPayoutReleaseCron } from '@/lib/bookings/payout-release-cron';
import { findStuckPayoutBookings } from '@/lib/bookings/stuck-payout-detector';
import {
  assertAllCanonicalMoneyKeysOnPaymentIntentMetadata,
  buildBookingCanonicalStripeSummaryFromRow,
} from '@/lib/stripe/get-booking-canonical-stripe-summary';
import {
  assertCanonicalBookingPaymentMetadata,
  assertCanonicalRefundMetadata,
  assertCanonicalTransferMetadata,
} from '@/lib/stripe/payment-metadata';
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

/** Same candidate filter + guards as {@link runPayoutReleaseCron} (narrowed to one booking id). */
async function assertBookingIsCronCandidateRow(
  admin: SupabaseClient,
  bookingId: string,
  message: string
): Promise<void> {
  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .or(payoutReleaseCronCandidateOrFilter())
    .eq('payout_released', false)
    .or('requires_admin_review.is.null,requires_admin_review.eq.false')
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null)
    .maybeSingle();
  assert.ok(!error, error?.message ?? String(error));
  assert.equal(data?.id, bookingId, message);
}

/** Inverse: row must not match production cron prefilter (e.g. requires_admin_review blocks auto-release). */
async function assertBookingIsNotCronCandidateRow(
  admin: SupabaseClient,
  bookingId: string,
  message: string
): Promise<void> {
  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .or(payoutReleaseCronCandidateOrFilter())
    .eq('payout_released', false)
    .or('requires_admin_review.is.null,requires_admin_review.eq.false')
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null)
    .maybeSingle();
  assert.ok(!error, error?.message ?? String(error));
  assert.equal(data, null, message);
}

type BookingMoneySnapshot = {
  payment_lifecycle_status?: string | null;
  refund_status?: string | null;
  stripe_transfer_id?: string | null;
  payout_transfer_id?: string | null;
  payout_released?: boolean | null;
  final_payment_intent_id?: string | null;
  final_payment_status?: string | null;
};

/**
 * Cross-field invariants so silent regressions (refund vs payout_sent, missing transfer id) fail loudly.
 */
function assertNoContradictoryMoneyState(row: BookingMoneySnapshot, ctx: string): void {
  const refund = String(row.refund_status ?? '').toLowerCase();
  const lc = String(row.payment_lifecycle_status ?? '');

  if (refund === 'succeeded' || refund === 'partial') {
    assert.notEqual(
      lc,
      'payout_sent',
      `${ctx}: refunded booking must not be payout_sent (lifecycle=${lc}, refund=${refund})`
    );
  }

  if (lc === 'payout_sent') {
    assert.ok(
      row.stripe_transfer_id && String(row.stripe_transfer_id).trim().length > 4,
      `${ctx}: payout_sent requires stripe_transfer_id`
    );
    assert.ok(
      row.payout_transfer_id && String(row.payout_transfer_id).trim().length > 4,
      `${ctx}: payout_sent requires payout_transfer_id`
    );
  }

  if (lc === 'final_paid' || lc === 'payout_ready') {
    assert.ok(
      row.final_payment_intent_id && String(row.final_payment_intent_id).trim().length > 4,
      `${ctx}: ${lc} after auto-charge path requires final_payment_intent_id`
    );
    assert.equal(
      String(row.final_payment_status ?? '').toUpperCase(),
      'PAID',
      `${ctx}: ${lc} requires final_payment_status PAID`
    );
  }
}

async function assertPostPayoutBookingRow(
  admin: SupabaseClient,
  bookingId: string,
  expectedTransferId: string,
  ctx: string
): Promise<void> {
  const { data: row, error } = await admin
    .from('bookings')
    .select(
      'payment_lifecycle_status, refund_status, stripe_transfer_id, payout_transfer_id, payout_released, final_payment_intent_id, final_payment_status, payout_status'
    )
    .eq('id', bookingId)
    .single();
  assert.ok(!error, error?.message ?? String(error));
  assert.equal(row?.payment_lifecycle_status, 'payout_sent', `${ctx}: lifecycle after successful transfer`);
  assert.equal(row?.payout_released, true, `${ctx}: payout_released`);
  assert.equal(row?.stripe_transfer_id, expectedTransferId, `${ctx}: stripe_transfer_id`);
  assert.equal(row?.payout_transfer_id, expectedTransferId, `${ctx}: payout_transfer_id`);
  assertNoContradictoryMoneyState(row, ctx);
}

async function assertBookingPayoutRow(
  admin: SupabaseClient,
  bookingId: string,
  expectedTransferId: string,
  ctx: string
): Promise<void> {
  const { data: bp, error } = await admin
    .from('booking_payouts')
    .select('stripe_transfer_id, status, booking_id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  assert.ok(!error, error?.message ?? String(error));
  assert.ok(bp, `${ctx}: booking_payouts row exists`);
  assert.ok(
    bp?.stripe_transfer_id && String(bp.stripe_transfer_id).trim().length > 4,
    `${ctx}: booking_payouts.stripe_transfer_id`
  );
  assert.equal(bp?.stripe_transfer_id, expectedTransferId, `${ctx}: booking_payouts transfer id`);
  assert.equal(bp?.status, 'released', `${ctx}: booking_payouts.status`);
}

/**
 * Stripe PaymentIntents and Connect transfers are **not** retrieved from Stripe in this test; we
 * simulate webhooks with minimal PI payloads. Metadata parity is validated by rebuilding deposit,
 * final, transfer (and an example refund) from the frozen `bookings` row via
 * {@link buildBookingCanonicalStripeSummaryFromRow} — the same builders production uses.
 */
async function assertCanonicalStripeMetadataContractsFromBookingRow(
  admin: SupabaseClient,
  input: { bookingId: string; piDeposit: string; piFinal: string },
  ctx: string
): Promise<void> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'customer_id',
        'pro_id',
        'subtotal_cents',
        'amount_subtotal',
        'total_amount_cents',
        'platform_fee_cents',
        'amount_platform_fee',
        'deposit_amount_cents',
        'final_amount_cents',
        'remaining_amount_cents',
        'pricing_version',
        'deposit_payment_intent_id',
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'customer_review_deadline_at',
        'amount_refunded_cents',
        'refunded_total_cents',
      ].join(', ')
    )
    .eq('id', input.bookingId)
    .single();
  assert.ok(!error, `${ctx}: ${error?.message ?? String(error)}`);
  assert.ok(b);
  const summary = buildBookingCanonicalStripeSummaryFromRow(b as Record<string, unknown>, {
    depositPaymentIntentId: input.piDeposit,
    finalPaymentIntentId: input.piFinal,
    serviceTitle: 'Integration payment fixture',
  });

  assertAllCanonicalMoneyKeysOnPaymentIntentMetadata(summary.depositPaymentIntentMetadata, `${ctx} deposit PI`);
  assertAllCanonicalMoneyKeysOnPaymentIntentMetadata(summary.finalPaymentIntentMetadata, `${ctx} final PI`);
  assertCanonicalBookingPaymentMetadata(summary.depositPaymentIntentMetadata);
  assertCanonicalBookingPaymentMetadata(summary.finalPaymentIntentMetadata);

  assert.ok(
    summary.connectTransferMetadata.transferred_total_cents,
    `${ctx}: transfer must stamp transferred_total_cents`
  );
  assert.equal(
    summary.connectTransferMetadata.transferred_total_cents,
    summary.connectTransferMetadata.payout_amount_cents,
    `${ctx}: transferred_total_cents mirrors payout_amount_cents`
  );
  assertCanonicalTransferMetadata(summary.connectTransferMetadata);

  assertCanonicalRefundMetadata(summary.exampleRefundOnFinalPaymentIntentMetadata);
}

async function insertLifecycleBooking(
  admin: SupabaseClient,
  proRowId: string,
  customerUserId: string,
  notes: string
): Promise<string> {
  const { data: bookingRow, error: bookErr } = await admin
    .from('bookings')
    .insert({
      customer_id: customerUserId,
      pro_id: proRowId,
      service_date: '2026-06-15',
      service_time: '10:00',
      address: '100 Integration Test Lane',
      notes,
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
      pricing_version: 'integration_fixture_v1',
    })
    .select('id')
    .single();
  if (bookErr || !bookingRow?.id) assert.fail(bookErr?.message ?? 'booking insert');
  return bookingRow.id as string;
}

async function seedThroughFinalPaidAndPayoutReady(
  admin: SupabaseClient,
  bookingId: string,
  proRowId: string,
  proUserId: string,
  piDeposit: string,
  piFinal: string
): Promise<void> {
  {
    const { data: row } = await admin
      .from('bookings')
      .select('final_amount_cents, remaining_amount_cents, total_amount_cents, deposit_amount_cents')
      .eq('id', bookingId)
      .single();
    assert.ok(row?.final_amount_cents != null && Number(row.final_amount_cents) > 0, 'fixture must have final balance');
    assert.equal(Number(row?.final_amount_cents), 8000);
    assert.equal(Number(row?.deposit_amount_cents), 2000);
    assert.equal(Number(row?.total_amount_cents), 10_000);
  }

  await finalizeDepositPaymentIntentProvisioning(admin, {
    bookingId,
    paymentIntentId: piDeposit,
    currency: 'usd',
    amountDepositCents: 2000,
  });
  {
    const { data: row } = await admin
      .from('bookings')
      .select(
        'payment_lifecycle_status, deposit_payment_intent_id, service_status, payment_status'
      )
      .eq('id', bookingId)
      .single();
    assert.equal(row?.payment_lifecycle_status, 'deposit_pending');
    assert.ok(
      row?.deposit_payment_intent_id && String(row.deposit_payment_intent_id) === piDeposit,
      'deposit_payment_intent_id must exist and match provisioning PI'
    );
    assert.equal(row?.service_status, 'deposit_pending');
    assert.notEqual(
      String(row?.payment_status ?? '').toUpperCase(),
      'PAID',
      'deposit: payment_status must not be PAID before deposit succeeds'
    );
  }

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
        'payment_lifecycle_status, payment_status, paid_deposit_at, stripe_payment_intent_deposit_id, deposit_payment_intent_id, payment_intent_id, amount_paid_cents, service_status'
      )
      .eq('id', bookingId)
      .single();
    assert.equal(row?.payment_lifecycle_status, 'deposit_paid');
    assert.equal(String(row?.payment_status ?? '').toUpperCase(), 'PAID');
    assert.ok(row?.paid_deposit_at);
    assert.equal(row?.stripe_payment_intent_deposit_id, piDeposit);
    assert.equal(row?.deposit_payment_intent_id, piDeposit);
    assert.equal(row?.payment_intent_id, piDeposit);
    assert.equal(row?.amount_paid_cents, 2000);
    assert.equal(row?.service_status, 'deposit_paid');
  }

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
    pro_id: proRowId,
    after_photo_urls: [
      'https://cdn.example/__integration__/lifecycle-after-a.jpg',
      'https://cdn.example/__integration__/lifecycle-after-b.jpg',
    ],
  });
  assert.ok(!jcErr, jcErr?.message);

  await markBookingCompleted(admin, { bookingId, completedByUserId: proUserId });
  {
    const { data: row } = await admin
      .from('bookings')
      .select(
        'payment_lifecycle_status, service_status, customer_review_deadline_at, final_amount_cents'
      )
      .eq('id', bookingId)
      .single();
    assert.equal(Number(row?.final_amount_cents), 8000, 'completion path assumes positive final');
    assert.equal(row?.payment_lifecycle_status, 'final_pending');
    assert.equal(row?.service_status, 'completed');
    assert.ok(row?.customer_review_deadline_at, 'customer_review_deadline_at must be set for positive final');
    const deadlineMs = Date.parse(String(row.customer_review_deadline_at));
    assert.ok(Number.isFinite(deadlineMs), 'customer_review_deadline_at must be a valid timestamp');
    assert.ok(
      deadlineMs > Date.parse(completedAt),
      'review deadline should be after completed_at for the 24h review window'
    );
  }

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
      .select(
        'payment_lifecycle_status, final_payment_intent_id, stripe_payment_intent_remaining_id, final_charge_attempted_at'
      )
      .eq('id', bookingId)
      .single();
    assert.equal(row?.payment_lifecycle_status, 'final_processing');
    assert.equal(row?.final_payment_intent_id, piFinal);
    assert.equal(row?.stripe_payment_intent_remaining_id, piFinal);
    assert.ok(row?.final_charge_attempted_at, 'final_charge_attempted_at should be set when entering final_processing');
  }

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
        'payment_lifecycle_status, final_payment_intent_id, final_payment_status, paid_remaining_at, fully_paid_at, amount_paid_cents, payout_blocked, status, stripe_payment_intent_remaining_id, payout_eligible_at, refund_status'
      )
      .eq('id', bookingId)
      .single();
    assert.equal(row?.final_payment_intent_id, piFinal);
    assert.equal(row?.stripe_payment_intent_remaining_id, piFinal);
    assert.equal(String(row?.final_payment_status ?? '').toUpperCase(), 'PAID');
    assert.ok(row?.paid_remaining_at);
    assert.ok(row?.fully_paid_at, 'fully_paid_at should be set when remainder succeeds');
    assert.equal(row?.amount_paid_cents, 10_000, 'amount_paid_cents = deposit + remainder');
    const lc = String(row?.payment_lifecycle_status ?? '');
    assert.ok(
      lc === 'final_paid' || lc === 'payout_ready',
      `after final PI success, lifecycle must be final_paid or payout_ready (got ${lc})`
    );
    assert.equal(row?.payout_blocked, false);
    assert.ok(row?.payout_eligible_at, 'payout_eligible_at should be set when immediately payout_ready');
    assert.equal(
      row?.status,
      'awaiting_customer_confirmation',
      'realistic post-final-payment workflow status'
    );
    assertNoContradictoryMoneyState(row, 'after handleFinalPaymentSucceeded');
  }

  await assertCanonicalStripeMetadataContractsFromBookingRow(
    admin,
    { bookingId, piDeposit, piFinal },
    'seedThroughFinalPaidAndPayoutReady'
  );
}

describe('integration: full deposit → final → payout lifecycle', { skip: !RUN }, () => {
  const created = {
    customerUserId: '' as string,
    proUserId: '' as string,
    proRowId: '' as string,
    directBookingId: '' as string,
    cronBookingId: '' as string,
    adminReviewBookingId: '' as string,
    categoryId: '' as string,
  };

  after(async () => {
    setCreateTransferForIntegrationTest(null);
    if (!RUN) return;

    const admin = createSupabaseAdmin();
    const bookingIds = [created.directBookingId, created.cronBookingId, created.adminReviewBookingId].filter(
      Boolean
    );

    if (created.adminReviewBookingId) {
      await admin.from('bookings').delete().eq('id', created.adminReviewBookingId);
    }
    if (created.cronBookingId) {
      await admin.from('bookings').delete().eq('id', created.cronBookingId);
    }
    if (created.directBookingId) {
      await admin.from('bookings').delete().eq('id', created.directBookingId);
    }
    if (created.proRowId) {
      await admin.from('service_pros').delete().eq('id', created.proRowId);
    }
    for (const uid of [created.customerUserId, created.proUserId]) {
      if (uid) {
        await admin.auth.admin.deleteUser(uid);
        const { data: authRes, error: authErr } = await admin.auth.admin.getUserById(uid);
        assert.ok(
          authErr != null || authRes?.user == null,
          `cleanup: auth user ${uid} should be removed (${authErr?.message ?? 'still present'})`
        );
      }
    }

    for (const id of bookingIds) {
      const { count: bCount, error: bErr } = await admin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('id', id);
      assert.ok(!bErr, bErr?.message);
      assert.equal(bCount ?? 0, 0, `cleanup: booking ${id} must not remain`);

      const { count: jcCount, error: jcErr } = await admin
        .from('job_completions')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', id);
      assert.ok(!jcErr, jcErr?.message);
      assert.equal(jcCount ?? 0, 0, `cleanup: job_completions for ${id} must not remain`);

      const { count: bpCount, error: bpErr } = await admin
        .from('booking_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', id);
      assert.ok(!bpErr, bpErr?.message);
      assert.equal(bpCount ?? 0, 0, `cleanup: booking_payouts for ${id} must not remain`);
    }

    if (created.proRowId) {
      const { count: proCount, error: proErr } = await admin
        .from('service_pros')
        .select('*', { count: 'exact', head: true })
        .eq('id', created.proRowId);
      assert.ok(!proErr, proErr?.message);
      assert.equal(proCount ?? 0, 0, 'cleanup: service_pros fixture row must not remain');
    }
  });

  before(async () => {
    const admin = createSupabaseAdmin();
    const suffix = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

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
  });

  it('A. direct: lifecycle through payout_ready then releasePayout (not cron)', async () => {
    const admin = createSupabaseAdmin();
    const suffix = `dir_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    const piDeposit = `pi_integration_dep_${suffix}`;
    const piFinal = `pi_integration_final_${suffix}`;
    const transferId = `tr_integration_${suffix}`;

    created.directBookingId = await insertLifecycleBooking(
      admin,
      created.proRowId,
      created.customerUserId,
      'full-payment-lifecycle A direct'
    );
    const bookingId = created.directBookingId;

    await seedThroughFinalPaidAndPayoutReady(
      admin,
      bookingId,
      created.proRowId,
      created.proUserId,
      piDeposit,
      piFinal
    );

    setCreateTransferForIntegrationTest(async () => transferId);
    const out = await releasePayout(admin, { bookingId });
    assert.equal(out.ok, true, `releasePayout failed: ${out.code ?? 'unknown'}`);
    assert.equal(out.transferId, transferId);

    const { data: payoutRow } = await admin
      .from('bookings')
      .select('payout_status')
      .eq('id', bookingId)
      .single();
    assert.equal(payoutRow?.payout_status, 'succeeded');

    await assertPostPayoutBookingRow(admin, bookingId, transferId, 'A direct releasePayout');
    await assertBookingPayoutRow(admin, bookingId, transferId, 'A direct releasePayout');
  });

  // Mirrors production cron discovery (shared `payoutReleaseCronCandidateOrFilter` + guards).
  it('B. cron: production parity — same selection as GET /api/cron/bookings/payout-release, then releasePayout via runPayoutReleaseCron', async () => {
    const admin = createSupabaseAdmin();
    const suffix = `cron_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    const piDeposit = `pi_integration_dep_${suffix}`;
    const piFinal = `pi_integration_final_${suffix}`;
    const transferId = `tr_integration_${suffix}`;

    created.cronBookingId = await insertLifecycleBooking(
      admin,
      created.proRowId,
      created.customerUserId,
      'full-payment-lifecycle B cron path'
    );
    const bookingId = created.cronBookingId;

    await seedThroughFinalPaidAndPayoutReady(
      admin,
      bookingId,
      created.proRowId,
      created.proUserId,
      piDeposit,
      piFinal
    );

    const snap = await getPayoutReleaseEligibilitySnapshot(admin, bookingId, { initiatedByAdmin: false });
    assert.equal(
      snap.eligible,
      true,
      `booking must be transfer-eligible before cron; snapshot: ${JSON.stringify(snap)}`
    );

    await assertBookingIsCronCandidateRow(
      admin,
      bookingId,
      'runPayoutReleaseCron candidate query must include this booking (same filters as payout-release-cron.ts)'
    );

    setCreateTransferForIntegrationTest(async () => transferId);
    const cronResult = await runPayoutReleaseCron(admin);
    assert.ok(
      cronResult.released >= 1,
      `cron must release at least this booking when eligible; result=${JSON.stringify(cronResult)}`
    );

    const { data: bAfterCron } = await admin
      .from('bookings')
      .select('payout_status, payout_released, stripe_transfer_id, payment_lifecycle_status')
      .eq('id', bookingId)
      .single();
    assert.equal(bAfterCron?.payout_status, 'succeeded');
    assert.equal(bAfterCron?.payout_released, true);
    assert.equal(bAfterCron?.payment_lifecycle_status, 'payout_sent');
    assert.ok(
      bAfterCron?.stripe_transfer_id && String(bAfterCron.stripe_transfer_id).includes('tr_'),
      'stripe_transfer_id set by releasePayout (stub)'
    );

    await assertPostPayoutBookingRow(admin, bookingId, transferId, 'B cron runPayoutReleaseCron');
    await assertBookingPayoutRow(admin, bookingId, transferId, 'B cron runPayoutReleaseCron');

    const stuck = await findStuckPayoutBookings(admin, { maxScan: 200, limit: 50, thresholdMs: 0 });
    assert.ok(
      !stuck.some((s) => s.bookingId === bookingId),
      'after successful auto-release, stuck payout detector must not flag this booking as a silent miss'
    );
  });

  // `requires_admin_review` is an intentional payout hold — not a stuck payout failure.
  // Transfer stub counts only `createTransfer` params.bookingId for this fixture (shared DB safe).
  it('C. negative: requires_admin_review excludes booking from cron selection; snapshot explains hold; not stuck', async () => {
    const admin = createSupabaseAdmin();
    const suffix = `adm_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
    const piDeposit = `pi_integration_dep_${suffix}`;
    const piFinal = `pi_integration_final_${suffix}`;

    created.adminReviewBookingId = await insertLifecycleBooking(
      admin,
      created.proRowId,
      created.customerUserId,
      'full-payment-lifecycle C admin review gate'
    );
    const bookingId = created.adminReviewBookingId;

    await seedThroughFinalPaidAndPayoutReady(
      admin,
      bookingId,
      created.proRowId,
      created.proUserId,
      piDeposit,
      piFinal
    );

    const { error: flagErr } = await admin.from('bookings').update({ requires_admin_review: true }).eq('id', bookingId);
    assert.ok(!flagErr, flagErr?.message);

    await assertBookingIsNotCronCandidateRow(
      admin,
      bookingId,
      'production cron query must skip rows with requires_admin_review=true'
    );

    const snap = await getPayoutReleaseEligibilitySnapshot(admin, bookingId, { initiatedByAdmin: false });
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'admin_review_required');
    assert.ok(
      String(snap.reason).toLowerCase().includes('admin'),
      `snapshot should explain admin gate, got: ${snap.reason}`
    );
    assert.ok(
      snap.missingRequirements.includes('admin_review_cleared'),
      `missingRequirements should surface admin_review_cleared: ${JSON.stringify(snap.missingRequirements)}`
    );

    let transferAttemptsForThisBooking = 0;
    setCreateTransferForIntegrationTest(async (params) => {
      if (params.bookingId === bookingId) {
        transferAttemptsForThisBooking += 1;
        return `tr_should_not_run_${suffix}`;
      }
      return `tr_other_${params.bookingId.replace(/-/g, '').slice(0, 12)}`;
    });
    await runPayoutReleaseCron(admin);
    assert.equal(
      transferAttemptsForThisBooking,
      0,
      'releasePayout must not run for a booking excluded from cron candidates (no transfer for this bookingId)'
    );

    const { data: row } = await admin
      .from('bookings')
      .select('payout_released, stripe_transfer_id, payment_lifecycle_status')
      .eq('id', bookingId)
      .single();
    assert.equal(row?.payout_released, false, 'payout must not release while admin review is set');
    assert.ok(!row?.stripe_transfer_id || String(row.stripe_transfer_id).trim() === '', 'no transfer id');
    assert.notEqual(row?.payment_lifecycle_status, 'payout_sent');

    const stuck = await findStuckPayoutBookings(admin, { maxScan: 200, limit: 50, thresholdMs: 0 });
    assert.ok(
      !stuck.some((s) => s.bookingId === bookingId),
      'admin-review bookings are excluded from stuck scan (not mis-reported as silent payout failure)'
    );
  });
});

describe('canonical Stripe metadata (always-on unit checks)', () => {
  it('throws when refund metadata omits refunded_amount_cents (guardrail)', () => {
    assert.throws(
      () =>
        assertCanonicalRefundMetadata({
          booking_id: '00000000-0000-4000-8000-000000000001',
          payment_phase: 'refund',
          subtotal_cents: '0',
          total_amount_cents: '0',
          platform_fee_cents: '0',
          deposit_amount_cents: '0',
          final_amount_cents: '0',
          pricing_version: 'unknown',
          refund_type: 'before_payout',
        }),
      /refunded_amount_cents/
    );
  });
});
