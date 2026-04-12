import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { countFlaggedPayoutReviewsForAdmin } from '@/lib/admin/flagged-payout-review';
import { FlaggedPayoutReviewPageClient } from '@/components/admin/FlaggedPayoutReviewPageClient';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPayoutReviewPage() {
  await requireAdminUser('/admin/payments/payout-review');
  const admin = createAdminSupabaseClient();
  const pendingCount = await countFlaggedPayoutReviewsForAdmin(admin);

  return (
    <Layout title="Flyers Up – Admin · Payout review">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-text">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-text">
            ← Admin
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Payout review</h1>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                {pendingCount} pending
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            Flagged bookings (<code className="text-xs">requires_admin_review</code>) do not auto-release. Approve
            releases the Stripe transfer when the server confirms eligibility — same checks as automatic payout.
          </p>
        </div>

        <FlaggedPayoutReviewPageClient />
      </div>
    </Layout>
  );
}
