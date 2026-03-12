import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Payment and Platform Fee Policy — Flyers Up',
};

export default function PaymentsPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Payment and Platform Fee Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Payment and Platform Fee Policy explains how payments flow through the Flyers Up platform, including
          platform fees, payouts, refunds, and related matters. This policy is incorporated by reference into our Terms
          of Service.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Payment Flow</h2>
        <p>
          When a customer books a service, the following flow applies:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><span className="font-medium">Customer Payment:</span> The customer authorizes payment at checkout. The total
            charge includes the service price, any applicable taxes, and platform fees.</li>
          <li><span className="font-medium">Stripe Processing:</span> Payments are processed by Stripe, our payment
            processor. Stripe may charge processing fees in addition to our platform fees.</li>
          <li><span className="font-medium">Platform Fee:</span> Flyers Up retains a platform fee from each transaction.
            The fee percentage is disclosed at checkout and in Pro dashboards. Platform fees are non-refundable except
            where required by law.</li>
          <li><span className="font-medium">Pro Payout:</span> The remaining amount, after platform fees and processing
            costs, is paid to the Pro through Stripe Connect, subject to the terms below.</li>
        </ol>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Deposits</h2>
        <p>
          For certain bookings, a deposit may be required at the time of booking. The deposit is held until service
          completion or cancellation. Deposit amounts and terms are disclosed at checkout. If a booking is cancelled,
          deposit refund eligibility is governed by our <Link href="/legal/refunds" className="underline hover:text-text">Refund and Cancellation Policy</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Payout Timing</h2>
        <p>
          Pro payouts are typically processed within a specified period after service completion, subject to Payment
          Processor rules and our risk controls. Payout timing is not guaranteed. Payouts may be delayed or withheld due
          to: verification or compliance reviews; disputes or chargebacks; suspected fraud; risk controls; or other
          integrity or legal requirements. Flyers Up may hold, reverse, offset, or adjust payouts to resolve disputes,
          satisfy refunds, address chargebacks, mitigate fraud, or enforce our terms.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Refunds</h2>
        <p>
          Refund eligibility is governed by our Refund and Cancellation Policy. Approved refunds are returned to the
          customer&apos;s original payment method. When a refund is issued, the corresponding Pro payout may be reduced or
          reversed. Platform fees are generally non-refundable except where required by applicable law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Cancellation Charges</h2>
        <p>
          Cancellations may result in partial or full charges depending on timing and circumstances. Late cancellations
          (within 24 hours of the scheduled service) may result in a cancellation fee. No-shows may result in full
          charges. Specific terms are disclosed at checkout and in our Refund and Cancellation Policy.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Chargebacks</h2>
        <p>
          If a customer disputes a charge with their card issuer (chargeback), the payment may be reversed. Flyers Up
          may withhold or reverse Pro payouts to cover chargebacks. Pros may be responsible for chargeback amounts and
          associated fees. We encourage Pros to maintain documentation of completed services.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Fee Transparency</h2>
        <p>
          All fees are disclosed to customers before payment is authorized and to Pros before they accept a booking.
          Platform fee percentages may vary by service category or region. We reserve the right to modify fee structures
          with reasonable notice; continued use after changes indicates acceptance.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Currency and Taxes</h2>
        <p>
          All amounts are in U.S. dollars unless otherwise indicated. Customers are responsible for any applicable sales
          or use taxes. Pros are responsible for their own tax obligations, including income and self-employment taxes.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Contact</h2>
        <p>
          Questions about payments or fees: Flyers Up LLC — hello.flyersup@gmail.com
        </p>
      </div>
    </LegalPageShell>
  );
}
