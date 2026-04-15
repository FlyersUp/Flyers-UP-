/**
 * POST /api/admin/bookings/[bookingId]/payment-lifecycle
 * Admin payment recovery & dispute actions (role = admin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import {
  attemptFinalCharge,
  logBookingPaymentEvent,
  openDispute,
  resolveDispute,
  runAdminApprovePayoutRelease,
  runAdminKeepPayoutOnHold,
  runAdminRefundCustomer,
  syncBookingPaymentSummary,
} from '@/lib/bookings/payment-lifecycle-service';
import { reconcileBookingForFinalAutoCharge } from '@/lib/bookings/final-charge-candidates';
import { refundPaymentIntent, refundPaymentIntentPartial } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { stripe as stripeClient } from '@/lib/stripe';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';
import { refundBatchIsComplete } from '@/lib/stripe/refund-batch-outcome';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  action: string;
  disputeId?: string;
  customerClaim?: string;
  resolution?: 'customer_favor' | 'pro_favor' | 'split';
  refundAmountCents?: number;
  adjustedFinalAmountCents?: number;
  adjustedPayoutAmountCents?: number;
  resolutionNotes?: string;
  adminHoldReason?: string;
  partialRefundCents?: number;
  /** For keep_payout_on_hold — short reason category or free text. */
  holdReason?: string;
  /** For keep_payout_on_hold — admin-only context. */
  internalNote?: string;
  /** For refund_customer — audit trail (recommended). */
  refundReason?: string;
  /** For refund_customer — admin-only context. */
  refundInternalNote?: string;
};

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  switch (body.action) {
    case 'retry_final_charge': {
      const r = await attemptFinalCharge(admin, {
        bookingId: id,
        initiatedByAdmin: true,
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: r.ok, code: r.code });
    }
    case 'reconcile_and_retry_final_charge': {
      const reconciled = await reconcileBookingForFinalAutoCharge(admin, id);
      const r = await attemptFinalCharge(admin, {
        bookingId: id,
        initiatedByAdmin: true,
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: r.ok, code: r.code, reconciled });
    }
    case 'send_final_payment_link': {
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'manual_payment_link_sent',
        phase: 'final',
        status: 'admin',
        actorType: 'admin',
        actorUserId: user.id,
        metadata: { source: 'admin_action' },
      });
      return NextResponse.json({ ok: true });
    }
    case 'apply_admin_hold': {
      await admin
        .from('bookings')
        .update({
          admin_hold: true,
          payout_blocked: true,
          payout_hold_reason: 'admin_hold',
          admin_hold_reason: body.adminHoldReason ?? 'Admin hold',
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'admin_hold_applied',
        phase: 'admin',
        status: 'applied',
        actorType: 'admin',
        actorUserId: user.id,
        metadata: { reason: body.adminHoldReason ?? null },
      });
      return NextResponse.json({ ok: true });
    }
    case 'release_admin_hold': {
      await admin
        .from('bookings')
        .update({
          admin_hold: false,
          admin_hold_reason: null,
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'admin_hold_released',
        phase: 'admin',
        status: 'released',
        actorType: 'admin',
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true });
    }
    case 'waive_final_payment': {
      await admin
        .from('bookings')
        .update({
          final_payment_status: 'PAID',
          final_amount_cents: 0,
          remaining_amount_cents: 0,
          amount_remaining: 0,
          payment_lifecycle_status: 'final_paid',
          paid_remaining_at: new Date().toISOString(),
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'final_payment_succeeded',
        phase: 'final',
        status: 'waived',
        actorType: 'admin',
        actorUserId: user.id,
        metadata: { waived: true },
      });
      return NextResponse.json({ ok: true });
    }
    case 'partial_refund': {
      const cents = body.partialRefundCents ?? body.refundAmountCents ?? 0;
      if (cents <= 0) return NextResponse.json({ error: 'refund amount required' }, { status: 400 });
      const { data: b } = await admin
        .from('bookings')
        .select(
          [
            'final_payment_intent_id',
            'stripe_payment_intent_remaining_id',
            'payment_intent_id',
            'stripe_payment_intent_deposit_id',
            'deposit_payment_intent_id',
            'amount_refunded_cents',
            'refunded_total_cents',
            'payout_released',
            'subtotal_cents',
            'total_amount_cents',
            'amount_total',
            'amount_platform_fee',
            'deposit_amount_cents',
            'amount_deposit',
            'final_amount_cents',
            'remaining_amount_cents',
            'pricing_version',
            'stripe_transfer_id',
            'payout_transfer_id',
          ].join(', ')
        )
        .eq('id', id)
        .maybeSingle();
      const br = b as Record<string, string | null | number | undefined> | null;
      const piFinal = br ? coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow) : null;
      const piDeposit = br ? coalesceBookingDepositPaymentIntentId(br as BookingFinalPaymentIntentIdRow) : null;
      const piId = piFinal ?? piDeposit;
      if (!piId) return NextResponse.json({ error: 'No PaymentIntent' }, { status: 400 });

      const depC = Number(br?.deposit_amount_cents ?? br?.amount_deposit ?? 0) || 0;
      const finC = Number(br?.final_amount_cents ?? br?.remaining_amount_cents ?? 0) || 0;
      const subC = Number(br?.subtotal_cents ?? 0) || 0;
      const totC = Number(br?.total_amount_cents ?? br?.amount_total ?? 0) || 0;
      const feeC = Number(br?.amount_platform_fee ?? 0) || 0;
      const pv = typeof br?.pricing_version === 'string' ? br.pricing_version : null;
      const afterPayout = (br as { payout_released?: boolean }).payout_released === true;
      const refundId = await refundPaymentIntentPartial(piId, cents, {
        metadata: refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'partial',
          resolution_type: 'admin',
          refunded_amount_cents: cents,
          refund_type: afterPayout ? 'after_payout' : 'before_payout',
          refund_source_payment_phase: piFinal ? 'final' : 'deposit',
          subtotal_cents: subC,
          total_amount_cents: totC,
          platform_fee_cents: feeC,
          deposit_amount_cents: depC,
          final_amount_cents: finC,
          pricing_version: pv,
        }),
        idempotencyKey: `admin-partial-refund-${id}-${piId}-${cents}`,
      });
      if (!refundId) {
        console.error('[admin partial_refund] refundPaymentIntentPartial returned null', {
          booking_id: id,
          payment_intent: piId,
          cents,
          note: 'Includes metadata validation abort and Stripe failures; do not treat as success.',
        });
        return NextResponse.json(
          { error: 'Stripe partial refund failed', code: 'refund_not_created' },
          { status: 502 }
        );
      }

      const prevRef =
        Number(br?.amount_refunded_cents ?? br?.refunded_total_cents ?? 0) || 0;
      const nextRef = prevRef + cents;
      await admin
        .from('bookings')
        .update({
          amount_refunded_cents: nextRef,
          refunded_total_cents: nextRef,
          payment_lifecycle_status: 'partially_refunded',
          ...(afterPayout ? { refund_after_payout: true, requires_admin_review: true } : {}),
        })
        .eq('id', id);
      const ledger = await appendBookingRefundEvent(admin, {
        bookingId: id,
        refundType: afterPayout ? 'after_payout' : 'before_payout',
        amountCents: cents,
        stripeRefundId: refundId,
        paymentIntentId: piId,
        requiresClawback: afterPayout,
        source: 'admin',
      });
      if (ledger.ok === false && 'error' in ledger) {
        console.warn('[admin partial_refund] ledger', ledger.error);
      }
      if (afterPayout) {
        const tid =
          typeof br?.stripe_transfer_id === 'string' && String(br.stripe_transfer_id).trim()
            ? String(br.stripe_transfer_id).trim()
            : typeof br?.payout_transfer_id === 'string' && String(br.payout_transfer_id).trim()
              ? String(br.payout_transfer_id).trim()
              : null;
        const rem = await recordRefundAfterPayoutRemediation(admin, {
          bookingId: id,
          idempotencyKey: `admin-partial:${id}:${refundId}`,
          source: 'admin_partial_refund',
          refundScope: 'partial',
          amountCents: cents,
          stripeRefundIds: [refundId],
          payoutReleased: true,
          stripeTransferId: tid,
          actorUserId: user.id,
          actorType: 'admin',
        });
        if (rem.ok && !rem.skipped) {
          await logBookingPaymentEvent(admin, {
            bookingId: id,
            eventType: 'post_payout_refund_remediation_opened',
            phase: 'refund',
            status: 'pending_review',
            actorType: 'admin',
            actorUserId: user.id,
            metadata: { remediation: 'admin_partial_refund' },
          });
        }
      }
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'refund_created',
        phase: 'refund',
        status: 'partial',
        amountCents: cents,
        stripeRefundId: refundId,
        actorType: 'admin',
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true, refundId });
    }
    case 'full_refund': {
      const { data: b } = await admin
        .from('bookings')
        .select(
          [
            'final_payment_intent_id',
            'stripe_payment_intent_remaining_id',
            'stripe_payment_intent_deposit_id',
            'deposit_payment_intent_id',
            'payment_intent_id',
            'payout_released',
            'deposit_amount_cents',
            'amount_deposit',
            'final_amount_cents',
            'remaining_amount_cents',
            'subtotal_cents',
            'total_amount_cents',
            'amount_total',
            'amount_platform_fee',
            'pricing_version',
            'stripe_transfer_id',
            'payout_transfer_id',
          ].join(', ')
        )
        .eq('id', id)
        .maybeSingle();
      const br = b as Record<string, string | number | boolean | null> | null;
      const piFinal = br ? coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow) : null;
      const piDep = br ? coalesceBookingDepositPaymentIntentId(br as BookingFinalPaymentIntentIdRow) : null;
      const afterPayout = br?.payout_released === true;
      const depCents = Number(br?.deposit_amount_cents ?? br?.amount_deposit ?? 0) || 0;
      const finalCents = Number(br?.final_amount_cents ?? br?.remaining_amount_cents ?? 0) || 0;
      const subSnap = Number(br?.subtotal_cents ?? 0) || 0;
      const totalSnap = Number(br?.total_amount_cents ?? br?.amount_total ?? 0) || 0;
      const platformSnap = Number(br?.amount_platform_fee ?? 0) || 0;
      const pricingSnap = typeof br?.pricing_version === 'string' ? br.pricing_version : null;
      if (!stripeClient) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });

      let attempted = 0;
      const recorded: { refundId: string; pi: string; cents: number }[] = [];
      if (piFinal) {
        attempted += 1;
        const rid = await refundPaymentIntent(
          piFinal,
          refundLifecycleMetadata({
            booking_id: id,
            refund_scope: 'full',
            resolution_type: 'admin_full_refund',
            refunded_amount_cents: finalCents > 0 ? finalCents : 0,
            refund_type: afterPayout ? 'after_payout' : 'before_payout',
            refund_source_payment_phase: 'final',
            subtotal_cents: subSnap,
            total_amount_cents: totalSnap,
            platform_fee_cents: platformSnap,
            deposit_amount_cents: depCents,
            final_amount_cents: finalCents,
            pricing_version: pricingSnap,
          })
        );
        if (!rid) {
          console.error('[admin full_refund] refundPaymentIntent returned null', {
            booking_id: id,
            payment_intent: piFinal,
            phase: 'final',
          });
        }
        if (rid) recorded.push({ refundId: rid, pi: piFinal, cents: finalCents > 0 ? finalCents : 0 });
      }
      if (piDep && piDep !== piFinal) {
        attempted += 1;
        const rid = await refundPaymentIntent(
          piDep,
          refundLifecycleMetadata({
            booking_id: id,
            refund_scope: 'full',
            resolution_type: 'admin_full_refund',
            refunded_amount_cents: depCents > 0 ? depCents : 0,
            refund_type: afterPayout ? 'after_payout' : 'before_payout',
            refund_source_payment_phase: 'deposit',
            subtotal_cents: subSnap,
            total_amount_cents: totalSnap,
            platform_fee_cents: platformSnap,
            deposit_amount_cents: depCents,
            final_amount_cents: finalCents,
            pricing_version: pricingSnap,
          })
        );
        if (!rid) {
          console.error('[admin full_refund] refundPaymentIntent returned null', {
            booking_id: id,
            payment_intent: piDep,
            phase: 'deposit',
          });
        }
        if (rid) recorded.push({ refundId: rid, pi: piDep, cents: depCents > 0 ? depCents : 0 });
      }

      if (attempted === 0) {
        return NextResponse.json({ error: 'No PaymentIntent for refund' }, { status: 400 });
      }
      if (!refundBatchIsComplete(attempted, recorded.length)) {
        console.error('[admin full_refund] refund batch incomplete — booking not marked refunded', {
          booking_id: id,
          attempted,
          succeeded: recorded.length,
        });
        return NextResponse.json(
          {
            ok: false,
            error: 'stripe_refund_incomplete',
            attempted,
            succeeded: recorded.length,
          },
          { status: 502 }
        );
      }

      await admin
        .from('bookings')
        .update({
          payment_lifecycle_status: 'refunded',
          refund_status: 'succeeded',
          ...(afterPayout ? { refund_after_payout: true, requires_admin_review: true } : {}),
        })
        .eq('id', id);
      for (const row of recorded) {
        const ins = await appendBookingRefundEvent(admin, {
          bookingId: id,
          refundType: afterPayout ? 'after_payout' : 'before_payout',
          amountCents: row.cents,
          stripeRefundId: row.refundId,
          paymentIntentId: row.pi,
          requiresClawback: afterPayout,
          source: 'admin',
        });
        if (ins.ok === false && 'error' in ins) console.warn('[admin full_refund] ledger', ins.error);
      }
      if (afterPayout && recorded.length > 0) {
        const tid =
          typeof br?.stripe_transfer_id === 'string' && String(br.stripe_transfer_id).trim()
            ? String(br.stripe_transfer_id).trim()
            : typeof br?.payout_transfer_id === 'string' && String(br.payout_transfer_id).trim()
              ? String(br.payout_transfer_id).trim()
              : null;
        const rem = await recordRefundAfterPayoutRemediation(admin, {
          bookingId: id,
          idempotencyKey: `admin-full-refund-route:${id}:${recorded.map((r) => r.refundId).join(':')}`,
          source: 'admin_full_refund_route',
          refundScope: 'full',
          stripeRefundIds: recorded.map((r) => r.refundId),
          payoutReleased: true,
          stripeTransferId: tid,
          actorUserId: user.id,
          actorType: 'admin',
        });
        if (rem.ok && !rem.skipped) {
          await logBookingPaymentEvent(admin, {
            bookingId: id,
            eventType: 'post_payout_refund_remediation_opened',
            phase: 'refund',
            status: 'pending_review',
            actorType: 'admin',
            actorUserId: user.id,
            metadata: { remediation: 'admin_full_refund_route' },
          });
        }
      }
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'refund_succeeded',
        phase: 'refund',
        status: 'full',
        actorType: 'admin',
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true });
    }
    case 'approve_payout': {
      const out = await runAdminApprovePayoutRelease(admin, { bookingId: id, actorUserId: user.id });
      if (!out.ok) {
        return NextResponse.json({ ok: false, code: out.code, transferId: out.transferId ?? null });
      }
      return NextResponse.json({
        ok: true,
        transferId: out.transferId ?? null,
        amountTransferredCents: out.amountTransferredCents ?? 0,
      });
    }
    case 'keep_payout_on_hold': {
      const out = await runAdminKeepPayoutOnHold(admin, {
        bookingId: id,
        actorUserId: user.id,
        holdReason: body.holdReason ?? null,
        internalNote: body.internalNote ?? null,
      });
      if (!out.ok) {
        return NextResponse.json({ ok: false, error: out.error ?? 'keep_on_hold_failed' }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        status: 'held',
        message: out.message ?? 'Payout remains on hold pending further review.',
      });
    }
    case 'refund_customer': {
      const out = await runAdminRefundCustomer(admin, {
        bookingId: id,
        actorUserId: user.id,
        refundReason: body.refundReason ?? null,
        internalNote: body.refundInternalNote ?? body.internalNote ?? null,
      });
      if (!out.ok) {
        const status =
          out.error === 'not_found'
            ? 404
            : out.error === 'already_released' || out.error === 'already_refunded'
              ? 409
              : out.error === 'stripe_not_configured'
                ? 500
                : out.error === 'stripe_refund_failed' || out.error === 'stripe_refund_partial_failure'
                  ? 502
                  : 400;
        return NextResponse.json({ ok: false, error: out.error ?? 'refund_failed' }, { status });
      }
      return NextResponse.json({
        ok: true,
        status: 'refunded',
        message: out.message ?? 'Customer refund processed; payout review cleared.',
      });
    }
    case 'open_dispute': {
      if (!body.customerClaim?.trim()) {
        return NextResponse.json({ error: 'customerClaim required' }, { status: 400 });
      }
      const { disputeId } = await openDispute(admin, {
        bookingId: id,
        reportedByUserId: user.id,
        customerClaim: body.customerClaim,
      });
      return NextResponse.json({ ok: true, disputeId });
    }
    case 'resolve_dispute': {
      if (!body.disputeId || !body.resolution) {
        return NextResponse.json({ error: 'disputeId and resolution required' }, { status: 400 });
      }
      await resolveDispute(admin, {
        disputeId: body.disputeId,
        adminUserId: user.id,
        resolution: body.resolution,
        refundAmountCents: body.refundAmountCents,
        adjustedFinalAmountCents: body.adjustedFinalAmountCents,
        adjustedPayoutAmountCents: body.adjustedPayoutAmountCents,
        resolutionNotes: body.resolutionNotes,
      });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
