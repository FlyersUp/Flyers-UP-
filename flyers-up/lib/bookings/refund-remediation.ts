/**
 * Operational remediation when a customer refund occurs after `payout_released` (Stripe Connect:
 * platform refunds the card; outbound Transfer to the connected account is not automatically reversed).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RefundRemediationSource =
  | 'admin_refund_customer'
  | 'admin_partial_refund'
  | 'admin_full_refund_route'
  | 'dispute'
  | 'webhook_charge_refunded'
  | 'cron_auto_refund'
  | 'system_cancel'
  | 'no_show_cancel'
  | 'post_completion_review_cancel';

export type RemediationEventType =
  | 'remediation_session'
  | 'refund_requested'
  | 'refund_succeeded'
  | 'payout_already_sent'
  | 'clawback_required'
  | 'stripe_connect_recovery_pending'
  | 'stripe_connect_recovery_not_applicable'
  | 'clawback_resolved'
  | 'clawback_waived';

const insertRemediationEvent = async (
  admin: SupabaseClient,
  row: {
    booking_id: string;
    event_type: RemediationEventType;
    details: Record<string, unknown>;
    actor_type: 'system' | 'admin' | 'cron';
    actor_user_id?: string | null;
    idempotency_key?: string | null;
  }
) => {
  const { error } = await admin.from('booking_refund_remediation_events').insert(row);
  return error;
};

/**
 * Idempotent bundle: same `idempotencyKey` only records once (session anchor row).
 * Call when `payout_released` was true at refund time and a Stripe refund was requested or applied.
 */
export async function recordRefundAfterPayoutRemediation(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    idempotencyKey: string;
    source: RefundRemediationSource;
    refundScope: 'full' | 'partial';
    amountCents?: number;
    stripeTransferId?: string | null;
    payoutReleased: boolean;
    /** Stripe refund id(s) when already known */
    stripeRefundIds?: string[];
    actorUserId?: string | null;
    actorType?: 'system' | 'admin' | 'cron';
    /** If true, emit refund_requested before refund_succeeded (admin pre-flight). */
    includeRefundRequested?: boolean;
  }
): Promise<{ ok: true; skipped: boolean } | { ok: false; error: string }> {
  if (!input.payoutReleased) {
    return { ok: true, skipped: true };
  }

  const actorType = input.actorType ?? 'system';
  const transferId =
    typeof input.stripeTransferId === 'string' && input.stripeTransferId.trim()
      ? input.stripeTransferId.trim()
      : null;
  const recoveryIsApplicable = Boolean(transferId);

  const sessionDetails = {
    source: input.source,
    refund_scope: input.refundScope,
    amount_cents: input.amountCents ?? null,
    stripe_transfer_id: transferId,
    stripe_refund_ids: input.stripeRefundIds ?? [],
    stripe_connect_transfer_reversal:
      recoveryIsApplicable ? 'pending_manual_review' : 'not_applicable_no_transfer_id',
  };

  const anchor: Parameters<typeof insertRemediationEvent>[1] = {
    booking_id: input.bookingId,
    event_type: 'remediation_session',
    details: sessionDetails,
    actor_type: actorType,
    actor_user_id: input.actorUserId ?? null,
    idempotency_key: input.idempotencyKey,
  };

  const err0 = await insertRemediationEvent(admin, anchor);
  if (err0) {
    if (String(err0.code) === '23505') {
      return { ok: true, skipped: true };
    }
    return { ok: false, error: err0.message };
  }

  const chain: { event_type: RemediationEventType; details: Record<string, unknown> }[] = [];

  if (input.includeRefundRequested) {
    chain.push({
      event_type: 'refund_requested',
      details: { source: input.source, refund_scope: input.refundScope },
    });
  }

  chain.push({
    event_type: 'refund_succeeded',
    details: {
      stripe_refund_ids: input.stripeRefundIds ?? [],
      refund_scope: input.refundScope,
      amount_cents: input.amountCents ?? null,
    },
  });

  chain.push({
    event_type: 'payout_already_sent',
    details: {
      payout_released: true,
      stripe_transfer_id: transferId,
    },
  });

  chain.push({
    event_type: 'clawback_required',
    details: {
      requires_pro_balance_recovery: true,
      note: 'Connect Transfer to the pro is not reversed by Stripe when the customer is refunded from the platform balance.',
    },
  });

  if (recoveryIsApplicable) {
    chain.push({
      event_type: 'stripe_connect_recovery_pending',
      details: {
        stripe_transfer_id: transferId,
        note: 'Evaluate transfer reversal window / manual recovery; not automatic.',
      },
    });
  } else {
    chain.push({
      event_type: 'stripe_connect_recovery_not_applicable',
      details: {
        reason: 'no_outbound_transfer_id_on_booking',
      },
    });
  }

  for (const ev of chain) {
    const e = await insertRemediationEvent(admin, {
      booking_id: input.bookingId,
      event_type: ev.event_type,
      details: ev.details,
      actor_type: actorType,
      actor_user_id: input.actorUserId ?? null,
      idempotency_key: null,
    });
    if (e) {
      console.error('[recordRefundAfterPayoutRemediation] chain insert failed', input.bookingId, ev.event_type, e);
      return { ok: false, error: e.message };
    }
  }

  const outboundStatus = recoveryIsApplicable ? 'pending_review' : 'not_applicable';

  const { error: upErr } = await admin
    .from('bookings')
    .update({
      refund_after_payout: true,
      requires_admin_review: true,
      pro_clawback_remediation_status: 'open',
      stripe_outbound_recovery_status: outboundStatus,
    })
    .eq('id', input.bookingId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  await mergePayoutReviewPostPayoutDetails(admin, input.bookingId, {
    source: input.source,
    idempotency_key: input.idempotencyKey,
    at: new Date().toISOString(),
    stripe_transfer_id: transferId,
    refund_scope: input.refundScope,
  });

  return { ok: true, skipped: false };
}

async function mergePayoutReviewPostPayoutDetails(
  admin: SupabaseClient,
  bookingId: string,
  payload: Record<string, unknown>
) {
  const { data: row } = await admin
    .from('payout_review_queue')
    .select('id, details, status, reason')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (!row) {
    const { error } = await admin.from('payout_review_queue').insert({
      booking_id: bookingId,
      reason: 'post_payout_customer_refund',
      status: 'pending_review',
      details: { post_payout_refund_remediation: payload },
    });
    if (error && String(error.code) !== '23505') {
      console.warn('[mergePayoutReviewPostPayoutDetails] insert failed', bookingId, error);
    }
    return;
  }

  const prev =
    row.details != null && typeof row.details === 'object' && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};
  const nextDetails = {
    ...prev,
    post_payout_refund_remediation: payload,
  };
  const { error: up } = await admin
    .from('payout_review_queue')
    .update({
      details: nextDetails,
      ...(String(row.reason ?? '').length === 0 || row.reason === 'payout_blocked'
        ? { reason: 'post_payout_customer_refund' as const }
        : {}),
    })
    .eq('id', (row as { id: string }).id);
  if (up) {
    console.warn('[mergePayoutReviewPostPayoutDetails] update failed', bookingId, up);
  }
}

export async function recordClawbackRemediationResolution(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    action: 'resolve' | 'waive';
    actorUserId: string;
    internalNote?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const eventType: RemediationEventType =
    input.action === 'waive' ? 'clawback_waived' : 'clawback_resolved';

  const { error: evErr } = await admin.from('booking_refund_remediation_events').insert({
    booking_id: input.bookingId,
    event_type: eventType,
    details: {
      internal_note: input.internalNote?.trim() || null,
      at: new Date().toISOString(),
    },
    actor_type: 'admin',
    actor_user_id: input.actorUserId,
  });
  if (evErr) return { ok: false, error: evErr.message };

  const clawback = input.action === 'waive' ? 'waived' : 'resolved';
  const recovery = input.action === 'waive' ? 'waived' : 'resolved_offline';

  const { error: upErr } = await admin
    .from('bookings')
    .update({
      pro_clawback_remediation_status: clawback,
      stripe_outbound_recovery_status: recovery,
      requires_admin_review: false,
    })
    .eq('id', input.bookingId);

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}
