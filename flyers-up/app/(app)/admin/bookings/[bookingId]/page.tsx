import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { loadAdminBookingPayoutCardData } from '@/lib/admin/flagged-payout-review';
import { PayoutReviewIsland } from './PayoutReviewIsland';

export const dynamic = 'force-dynamic';

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  await requireAdminUser('/admin/bookings');
  const { bookingId: raw } = await params;
  const id = normalizeUuidOrNull(raw);
  if (!id) {
    return (
      <Layout title="Flyers Up – Admin · Booking">
        <div className="mx-auto max-w-3xl p-6 text-text">Invalid booking id.</div>
      </Layout>
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, status, service_date, service_time, address, customer_id, pro_id, requires_admin_review, payout_released, created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (!booking) {
    return (
      <Layout title="Flyers Up – Admin · Booking">
        <div className="mx-auto max-w-3xl p-6 text-text">Booking not found.</div>
      </Layout>
    );
  }

  const b = booking as Record<string, unknown>;
  const needsPayoutReview = b.requires_admin_review === true && b.payout_released !== true;
  const payoutCardData = needsPayoutReview ? await loadAdminBookingPayoutCardData(admin, id) : null;

  return (
    <Layout title="Flyers Up – Admin · Booking">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-text">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin/bookings" className="text-sm text-muted hover:text-text">
              ← Bookings
            </Link>
            <h1 className="mt-2 text-xl font-semibold">Booking</h1>
            <p className="mt-1 font-mono text-xs text-muted break-all">{id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/bookings/${id}/payments`}
              className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium shadow-sm hover:bg-surface2"
            >
              Payment audit
            </Link>
            <Link
              href={`/admin/disputes/${id}`}
              className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium shadow-sm hover:bg-surface2"
            >
              Dispute / evidence
            </Link>
          </div>
        </div>

        <section className="rounded-[18px] border border-hairline bg-surface p-4 shadow-card text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <span className="text-muted">Status</span>
              <p className="font-medium">{String(b.status ?? '—')}</p>
            </div>
            <div>
              <span className="text-muted">Service</span>
              <p className="font-medium">
                {String(b.service_date ?? '—')} {String(b.service_time ?? '')}
              </p>
            </div>
            <div>
              <span className="text-muted">Payout released</span>
              <p className="font-medium">{b.payout_released === true ? 'Yes' : 'No'}</p>
            </div>
          </div>
          {typeof b.address === 'string' && b.address ? (
            <p>
              <span className="text-muted">Address: </span>
              {b.address}
            </p>
          ) : null}
        </section>

        {needsPayoutReview && payoutCardData ? (
          <PayoutReviewIsland bookingId={id} data={payoutCardData} />
        ) : null}
      </div>
    </Layout>
  );
}
