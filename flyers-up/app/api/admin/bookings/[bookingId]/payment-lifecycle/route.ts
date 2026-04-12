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
import { stripe as stripeClient } from '@/lib/stripe';

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
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
          'final_payment_intent_id, stripe_payment_intent_remaining_id, payment_intent_id, stripe_payment_intent_deposit_id, amount_refunded_cents, refunded_total_cents'
        )
        .eq('id', id)
        .maybeSingle();
      const br = b as Record<string, string | null | number | undefined> | null;
      const piFinal =
        (br?.final_payment_intent_id as string) ?? (br?.stripe_payment_intent_remaining_id as string) ?? null;
      const piDeposit = (br?.stripe_payment_intent_deposit_id as string) ?? (br?.payment_intent_id as string) ?? null;
      const piId = piFinal ?? piDeposit;
      if (!piId) return NextResponse.json({ error: 'No PaymentIntent' }, { status: 400 });

      const refundId = await refundPaymentIntentPartial(piId, cents, {
        metadata: {
          booking_id: id,
          payment_phase: 'refund',
          refund_scope: 'partial',
          resolution_type: 'admin',
        },
        idempotencyKey: `admin-partial-refund-${id}-${piId}-${cents}`,
      });
      if (!refundId) {
        return NextResponse.json({ error: 'Stripe partial refund failed' }, { status: 502 });
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
        })
        .eq('id', id);
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
        .select('final_payment_intent_id, stripe_payment_intent_remaining_id, stripe_payment_intent_deposit_id, payment_intent_id')
        .eq('id', id)
        .maybeSingle();
      const br = b as Record<string, string | null> | null;
      const piFinal = br?.final_payment_intent_id ?? br?.stripe_payment_intent_remaining_id;
      const piDep = br?.stripe_payment_intent_deposit_id ?? br?.payment_intent_id;
      if (!stripeClient) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
      if (piFinal) await refundPaymentIntent(piFinal, { booking_id: id, payment_phase: 'refund', refund_scope: 'full' });
      if (piDep && piDep !== piFinal) {
        await refundPaymentIntent(piDep, { booking_id: id, payment_phase: 'refund', refund_scope: 'full' });
      }
      await admin
        .from('bookings')
        .update({ payment_lifecycle_status: 'refunded', refund_status: 'succeeded' })
        .eq('id', id);
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
