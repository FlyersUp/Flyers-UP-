import { redirect } from 'next/navigation';

/** Legacy URL — canonical queue is under Payments. */
export default function AdminPayoutReviewRedirectPage() {
  redirect('/admin/payments/payout-review');
}
