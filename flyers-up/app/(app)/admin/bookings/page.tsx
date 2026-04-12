import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { adminSetBookingStatusAction } from '@/app/(app)/admin/_actions';
import { buildUnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeUuidOrNull(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

const STATUS_OPTIONS = ['requested', 'accepted', 'declined', 'awaiting_payment', 'completed', 'cancelled'] as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser('/admin/bookings');

  const sp = await searchParams;
  const q = (pickFirst(sp.q) ?? '').trim();
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  const admin = createAdminSupabaseClient();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  const BOOKING_PAYMENT_COLUMNS =
    'id, status, service_date, service_time, address, notes, customer_id, pro_id, created_at, total_amount_cents, amount_deposit, amount_remaining, amount_total, payment_status, final_payment_status, refunded_total_cents, refund_status, stripe_payment_intent_deposit_id, stripe_payment_intent_remaining_id, payment_intent_id, final_payment_intent_id, paid_deposit_at, paid_remaining_at, paid_at, fully_paid_at, price, customer_receipt_deposit_email_at, customer_receipt_final_email_at, customer_receipt_deposit_email_note, customer_receipt_final_email_note, requires_admin_review, payout_released';

  let rows: any[] = [];
  if (!q) {
    const { data } = await admin
      .from('bookings')
      .select(BOOKING_PAYMENT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(50);
    rows = data ?? [];
  } else {
    const asId = normalizeUuidOrNull(q);
    let query = admin
      .from('bookings')
      .select(BOOKING_PAYMENT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);

    if (asId) {
      // Match booking id OR customer id OR pro id
      query = query.or(`id.eq.${asId},customer_id.eq.${asId},pro_id.eq.${asId}`);
    } else {
      // Address search (best-effort)
      query = query.ilike('address', `%${q}%`);
    }

    const { data } = await query;
    rows = data ?? [];
  }

  const bookingIds = rows.map((b) => String(b.id));
  const customerIds = Array.from(new Set(rows.map((b) => String(b.customer_id)).filter(Boolean)));
  const proIds = Array.from(new Set(rows.map((b) => String(b.pro_id)).filter(Boolean)));

  const customerById = new Map<string, { name: string | null; email: string | null }>();
  if (customerIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', customerIds);
    (profs ?? []).forEach((p: any) => {
      customerById.set(String(p.id), {
        name: typeof p.full_name === 'string' ? p.full_name : null,
        email: typeof p.email === 'string' ? p.email : null,
      });
    });
  }

  const proByServiceProId = new Map<string, { displayName: string | null; userId: string | null }>();
  if (proIds.length > 0) {
    const { data: pros } = await admin
      .from('service_pros')
      .select('id, display_name, user_id')
      .in('id', proIds);
    (pros ?? []).forEach((p: any) => {
      proByServiceProId.set(String(p.id), {
        displayName: typeof p.display_name === 'string' ? p.display_name : null,
        userId: typeof p.user_id === 'string' ? p.user_id : null,
      });
    });
  }

  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Bookings</h1>
            <p className="mt-1 text-sm text-muted">
              Search by booking id, customer id, pro id, or address (best-effort). Latest bookings shown by default.
            </p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        {ok ? (
          <div className="mt-4 p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {ok}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>
        ) : null}

        {!resendConfigured ? (
          <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-text">
            RESEND_API_KEY is not set — Flyers Up customer receipt emails are skipped (see per-booking receipt
            notes in the Payments column).
          </div>
        ) : null}

        <form className="mt-5 flex gap-2" action="/admin/bookings" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search booking/customer/pro UUID, or address…"
            className="flex-1 w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-muted/70"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95">
            Search
          </button>
          <Link href="/admin/bookings" className="px-4 py-2 rounded-lg bg-surface2 text-text font-medium hover:bg-surface">
            Reset
          </Link>
        </form>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Booking</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Pro</th>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Payments</th>
                  <th className="text-left px-4 py-3 font-medium">Manual override</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((b: any) => {
                  const id = String(b.id);
                  const cust = customerById.get(String(b.customer_id)) ?? { name: null, email: null };
                  const pro = proByServiceProId.get(String(b.pro_id)) ?? { displayName: null, userId: null };
                  const returnTo = q ? `/admin/bookings?q=${encodeURIComponent(q)}` : '/admin/bookings';

                  const receipt = buildUnifiedBookingReceipt({
                    bookingId: id,
                    status: String(b.status ?? ''),
                    paymentStatus: String(b.payment_status ?? 'UNPAID'),
                    finalPaymentStatus: (b.final_payment_status as string) ?? null,
                    paidAt: (b.paid_at as string) ?? null,
                    paidDepositAt: (b.paid_deposit_at as string) ?? null,
                    paidRemainingAt: (b.paid_remaining_at as string) ?? null,
                    fullyPaidAt: (b.fully_paid_at as string) ?? null,
                    amountDeposit: (b.amount_deposit as number) ?? null,
                    amountRemaining: (b.amount_remaining as number) ?? null,
                    amountTotal: (b.total_amount_cents as number) ?? (b.amount_total as number) ?? null,
                    totalAmountCents: (b.total_amount_cents as number) ?? null,
                    price: (b.price as number) ?? null,
                    refundedTotalCents: (b.refunded_total_cents as number) ?? null,
                    refundStatus: (b.refund_status as string) ?? null,
                    serviceTitle: '—',
                    proName: '—',
                    stripePaymentIntentDepositId:
                      (b.stripe_payment_intent_deposit_id as string) ?? null,
                    stripePaymentIntentRemainingId:
                      (b.stripe_payment_intent_remaining_id as string) ?? null,
                    paymentIntentId: (b.payment_intent_id as string) ?? null,
                    finalPaymentIntentId: (b.final_payment_intent_id as string) ?? null,
                  });
                  const depPi =
                    receipt.stripePaymentIntentDepositId ??
                    (b.payment_intent_id as string) ??
                    '—';
                  const remPi =
                    receipt.stripePaymentIntentRemainingId ??
                    (b.final_payment_intent_id as string) ??
                    '—';
                  const totalCents = receipt.totalBookingCents;

                  const depEmailSent = Boolean(b.customer_receipt_deposit_email_at);
                  const finEmailSent = Boolean(b.customer_receipt_final_email_at);
                  const depNote = (b.customer_receipt_deposit_email_note as string) ?? '';
                  const finNote = (b.customer_receipt_final_email_note as string) ?? '';
                  const depEmailLabel = depEmailSent
                    ? 'Deposit receipt sent'
                    : depNote.includes('skipped_resend')
                      ? 'Deposit receipt skipped (email provider not configured)'
                      : !resendConfigured && b.paid_deposit_at
                        ? 'Deposit receipt not sent (no provider)'
                        : depNote
                          ? `Deposit: ${depNote}`
                          : 'Deposit receipt —';
                  const finEmailLabel = finEmailSent
                    ? 'Final receipt sent'
                    : finNote.includes('skipped_resend')
                      ? 'Final receipt skipped (email provider not configured)'
                      : !resendConfigured && b.fully_paid_at
                        ? 'Final receipt not sent (no provider)'
                        : finNote
                          ? `Final: ${finNote}`
                          : 'Final receipt —';

                  return (
                    <tr key={id} className="border-t border-hairline">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/bookings/${id}`}
                          className="font-medium text-accent hover:underline truncate max-w-[24ch] block font-mono text-xs"
                          title={id}
                        >
                          {id.slice(0, 8)}…
                        </Link>
                        {b.requires_admin_review === true && b.payout_released !== true ? (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                            Payout review
                          </span>
                        ) : null}
                        <div className="text-xs text-muted/80 truncate max-w-[32ch] mt-1" title={b.address ?? ''}>
                          {b.address ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{cust.name || 'Customer'}</div>
                        <div className="text-xs text-muted/80 truncate max-w-[28ch]" title={cust.email ?? ''}>
                          {cust.email ?? b.customer_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{pro.displayName || 'Service Pro'}</div>
                        <div className="text-xs text-muted/80 truncate max-w-[28ch]" title={pro.userId ?? ''}>
                          {pro.userId ?? b.pro_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {b.service_date ? `${b.service_date} ${b.service_time ?? ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-hairline bg-surface2 px-2 py-0.5 text-xs font-medium">
                          {String(b.status ?? '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted align-top max-w-[28ch]">
                        <div className="text-text font-medium">
                          {totalCents > 0
                            ? `$${(totalCents / 100).toFixed(2)} total · ${receipt.overallStatus.replace(/_/g, ' ')}`
                            : receipt.overallStatus.replace(/_/g, ' ')}
                        </div>
                        <div className="mt-1 font-mono text-[10px] break-all opacity-90" title={String(depPi)}>
                          D: {depPi === '—' ? '—' : `${String(depPi).slice(0, 14)}…`}
                        </div>
                        <div className="font-mono text-[10px] break-all opacity-90" title={String(remPi)}>
                          R: {remPi === '—' ? '—' : `${String(remPi).slice(0, 14)}…`}
                        </div>
                        {Number(b.refunded_total_cents ?? 0) > 0 ? (
                          <div className="mt-1 text-danger/90">
                            Refunded ${(Number(b.refunded_total_cents) / 100).toFixed(2)}
                          </div>
                        ) : null}
                        <div className="mt-2 space-y-0.5 text-[10px] leading-snug text-muted border-t border-hairline pt-2">
                          <div title={depEmailLabel}>{depEmailLabel}</div>
                          <div title={finEmailLabel}>{finEmailLabel}</div>
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            <Link href={`/admin/bookings/${id}`} className="text-accent hover:underline font-medium">
                              Booking →
                            </Link>
                            <Link
                              href={`/admin/bookings/${id}/payments`}
                              className="text-accent hover:underline font-medium"
                            >
                              Payments →
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <form action={adminSetBookingStatusAction} className="flex items-center gap-2">
                          <input type="hidden" name="bookingId" value={id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <select
                            name="status"
                            defaultValue={String(b.status ?? 'requested')}
                            className="px-2 py-1.5 rounded-lg bg-surface border border-border text-text text-sm"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 text-text font-medium"
                          >
                            Apply
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {(rows ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                      No bookings found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

