import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { getBookingReceipt } from '@/lib/bookings/booking-receipt-service';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';
import { RefundRemediationAdminPanel } from '@/components/admin/RefundRemediationAdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminBookingPaymentsAuditPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  await requireAdminUser('/admin/bookings');
  const { bookingId: raw } = await params;
  const id = normalizeUuidOrNull(raw);
  if (!id) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-4xl mx-auto p-6 text-text">Invalid booking id.</div>
      </Layout>
    );
  }

  const admin = createAdminSupabaseClient();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  const { data: booking } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'status',
        'payment_status',
        'final_payment_status',
        'customer_receipt_deposit_email_at',
        'customer_receipt_final_email_at',
        'customer_receipt_deposit_email_note',
        'customer_receipt_final_email_note',
        'stripe_payment_intent_deposit_id',
        'stripe_payment_intent_remaining_id',
        'deposit_payment_intent_id',
        'payment_intent_id',
        'final_payment_intent_id',
        'refunded_total_cents',
        'refund_status',
        'payout_released',
        'refund_after_payout',
        'pro_clawback_remediation_status',
        'stripe_outbound_recovery_status',
        'stripe_transfer_id',
        'paid_deposit_at',
        'paid_remaining_at',
        'fully_paid_at',
      ].join(', ')
    )
    .eq('id', id)
    .maybeSingle();

  const { data: events } = await admin
    .from('booking_events')
    .select('id, type, data, created_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(80);

  const { data: claims } = await admin
    .from('booking_receipt_email_claims')
    .select('stripe_event_id, email_kind, created_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: false });

  const { data: refundEvents } = await admin
    .from('booking_refund_events')
    .select(
      'id, created_at, refund_type, stripe_refund_id, stripe_charge_id, payment_intent_id, amount_cents, requires_clawback, stripe_event_id, source'
    )
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: remediationEvents } = await admin
    .from('booking_refund_remediation_events')
    .select('id, created_at, event_type, details, actor_type')
    .eq('booking_id', id)
    .order('created_at', { ascending: true })
    .limit(80);

  const receipt = await getBookingReceipt(admin, id);

  return (
    <Layout title="Flyers Up – Admin · Booking payments">
      <div className="max-w-4xl mx-auto px-4 py-6 text-text space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Payment audit</h1>
            <p className="text-sm text-muted mt-1 font-mono break-all">{id}</p>
          </div>
          <Link href="/admin/bookings" className="text-sm text-muted hover:text-text">
            ← Bookings
          </Link>
        </div>

        {!booking ? (
          <p className="text-muted">Booking not found.</p>
        ) : (
          <>
            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Email provider</h2>
              <p className="text-muted">
                {resendConfigured
                  ? 'RESEND_API_KEY is set — customer receipt emails can send.'
                  : 'RESEND_API_KEY is not set — customer receipts are skipped with a note on the booking.'}
              </p>
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="text-muted">Deposit receipt sent at:</span>{' '}
                  {(booking as { customer_receipt_deposit_email_at?: string | null })
                    .customer_receipt_deposit_email_at ?? '—'}
                </div>
                <div>
                  <span className="text-muted">Final receipt sent at:</span>{' '}
                  {(booking as { customer_receipt_final_email_at?: string | null })
                    .customer_receipt_final_email_at ?? '—'}
                </div>
                <div>
                  <span className="text-muted">Deposit note:</span>{' '}
                  {(booking as { customer_receipt_deposit_email_note?: string | null })
                    .customer_receipt_deposit_email_note ?? '—'}
                </div>
                <div>
                  <span className="text-muted">Final note:</span>{' '}
                  {(booking as { customer_receipt_final_email_note?: string | null })
                    .customer_receipt_final_email_note ?? '—'}
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Refund / payout flags (DB)</h2>
              <p className="text-xs text-muted leading-relaxed">
                Stripe Connect: refunding a charge credits the customer from the platform balance. An outbound Transfer to
                a connected account is not reversed automatically — see clawback on ledger rows.
              </p>
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="text-muted">Payout released:</span>{' '}
                  {(booking as { payout_released?: boolean }).payout_released === true ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="text-muted">Refund after payout:</span>{' '}
                  {(booking as { refund_after_payout?: boolean }).refund_after_payout === true ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="text-muted">Pro clawback remediation:</span>{' '}
                  <span className="font-mono">
                    {(booking as { pro_clawback_remediation_status?: string }).pro_clawback_remediation_status ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Stripe outbound recovery:</span>{' '}
                  <span className="font-mono">
                    {(booking as { stripe_outbound_recovery_status?: string }).stripe_outbound_recovery_status ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">stripe_transfer_id:</span>{' '}
                  <span className="font-mono break-all">
                    {(booking as { stripe_transfer_id?: string | null }).stripe_transfer_id ?? '—'}
                  </span>
                </div>
              </div>
              <RefundRemediationAdminPanel
                bookingId={id}
                clawbackStatus={
                  String((booking as { pro_clawback_remediation_status?: string }).pro_clawback_remediation_status ?? 'none')
                }
                recoveryStatus={String(
                  (booking as { stripe_outbound_recovery_status?: string }).stripe_outbound_recovery_status ??
                    'not_applicable'
                )}
              />
            </section>

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Post–payout refund remediation (append-only)</h2>
              {!remediationEvents?.length ? (
                <p className="text-muted text-xs">No rows in booking_refund_remediation_events.</p>
              ) : (
                <ul className="space-y-2 text-xs font-mono break-all">
                  {(remediationEvents as Record<string, unknown>[]).map((r) => (
                    <li key={String(r.id)} className="border-b border-hairline pb-2">
                      <div>
                        {String(r.created_at)} · {String(r.event_type)} · {String(r.actor_type ?? '')}
                      </div>
                      <pre className="text-muted mt-1 whitespace-pre-wrap break-all text-[11px]">
                        {JSON.stringify(r.details, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Refund ledger (append-only)</h2>
              {!refundEvents?.length ? (
                <p className="text-muted text-xs">No rows in booking_refund_events.</p>
              ) : (
                <ul className="space-y-2 text-xs font-mono break-all">
                  {(refundEvents as Record<string, unknown>[]).map((r) => (
                    <li key={String(r.id)} className="border-b border-hairline pb-2">
                      <div>
                        {String(r.created_at)} · {String(r.refund_type)} · ${(Number(r.amount_cents ?? 0) / 100).toFixed(2)}{' '}
                        · clawback {r.requires_clawback === true ? 'yes' : 'no'} · {String(r.source ?? '')}
                      </div>
                      <div className="text-muted mt-0.5">
                        re: {String(r.stripe_refund_id ?? '—')} · ch: {String(r.stripe_charge_id ?? '—')} · pi:{' '}
                        {String(r.payment_intent_id ?? '—')}
                      </div>
                      {r.stripe_event_id ? (
                        <div className="text-muted">evt: {String(r.stripe_event_id)}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Stripe PaymentIntent ids (DB)</h2>
              <pre className="text-xs bg-surface2 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(
                  {
                    stripe_payment_intent_deposit_id: (booking as { stripe_payment_intent_deposit_id?: string })
                      .stripe_payment_intent_deposit_id,
                    stripe_payment_intent_remaining_id: (booking as { stripe_payment_intent_remaining_id?: string })
                      .stripe_payment_intent_remaining_id,
                    deposit_payment_intent_id: (booking as { deposit_payment_intent_id?: string })
                      .deposit_payment_intent_id,
                    payment_intent_id: (booking as { payment_intent_id?: string }).payment_intent_id,
                    final_payment_intent_id: (booking as { final_payment_intent_id?: string })
                      .final_payment_intent_id,
                    coalesced_final_payment_intent_id: coalesceBookingFinalPaymentIntentId(
                      booking as BookingFinalPaymentIntentIdRow
                    ),
                    coalesced_deposit_payment_intent_id: coalesceBookingDepositPaymentIntentId(
                      booking as BookingFinalPaymentIntentIdRow
                    ),
                  },
                  null,
                  2
                )}
              </pre>
            </section>

            {receipt ? (
              <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
                <h2 className="font-medium">Unified receipt (server)</h2>
                {receipt.warnings?.length ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Warnings: {receipt.warnings.join(', ')}
                  </p>
                ) : null}
                <pre className="text-xs bg-surface2 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(receipt, null, 2)}
                </pre>
              </section>
            ) : null}

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Webhook email claims (per Stripe event)</h2>
              {!claims?.length ? (
                <p className="text-muted text-xs">None recorded.</p>
              ) : (
                <ul className="space-y-1 text-xs font-mono break-all">
                  {claims.map((c: { stripe_event_id: string; email_kind: string; created_at: string }) => (
                    <li key={c.stripe_event_id}>
                      {c.email_kind} · {c.stripe_event_id} · {c.created_at}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card space-y-2 text-sm">
              <h2 className="font-medium">Booking events (recent)</h2>
              {!events?.length ? (
                <p className="text-muted text-xs">None.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {(events as { id: string; type: string; data: unknown; created_at: string }[]).map((e) => (
                    <li key={e.id} className="border-b border-hairline pb-2">
                      <div className="font-medium">{e.type}</div>
                      <div className="text-muted">{e.created_at}</div>
                      <pre className="mt-1 font-mono whitespace-pre-wrap break-all opacity-90">
                        {JSON.stringify(e.data, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
