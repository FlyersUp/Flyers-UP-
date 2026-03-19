import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Refund and Cancellation Policy — Flyers Up',
};

export default function RefundsPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Refund and Cancellation Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Refund and Cancellation Policy explains the terms governing cancellations, refunds, and dispute
          resolution for bookings made through the Flyers Up platform. This policy is incorporated by reference into
          our Terms of Service.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Cancellation Windows</h2>
        <h3 className="text-base font-semibold tracking-tight pt-2">1.1 Customer Cancellation (24+ Hours Before Service)</h3>
        <p>
          If a customer cancels at least 24 hours before the scheduled service time, the customer is eligible for a
          refund of the service amount paid, excluding the Flyers Up Protection &amp; Service Fee. The Protection
          &amp; Service Fee is non-refundable except where required by applicable law.
        </p>

        <h3 className="text-base font-semibold tracking-tight pt-2">1.2 Customer Cancellation (Within 24 Hours)</h3>
        <p>
          Cancellations within 24 hours of the scheduled service time may result in a partial refund or no refund, as
          determined by Flyers Up in accordance with our then-current policies and the information disclosed at
          checkout. Late cancellation fees may apply.
        </p>

        <h3 className="text-base font-semibold tracking-tight pt-2">1.3 Pro Cancellation</h3>
        <p>
          If a Pro cancels a booking, the customer will receive a full refund of amounts paid, including the Protection
          &amp; Service Fee where applicable. We may take action against Pros who cancel repeatedly.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — No-Shows</h2>
        <p>
          <span className="font-medium">Customer no-show:</span> If the customer does not appear for the scheduled
          service and does not cancel in advance, no refund will be issued (except where required by law).
        </p>
        <p>
          <span className="font-medium">Pro no-show:</span> If the Pro does not appear for the scheduled service, the
          customer may receive a full refund or credit at Flyers Up&apos;s discretion. We may take action against Pros who
          fail to show.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Refund Eligibility</h2>
        <p>
          Refund eligibility depends on timing, circumstances, and the terms disclosed at checkout. Approved refunds, if
          any, are returned to the customer&apos;s original payment method unless otherwise required by law or Payment
          Processor rules. Refunds typically process within 5–10 business days.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Deposit Handling</h2>
        <p>
          For bookings that require a deposit, the deposit is held until service completion or cancellation. If the
          booking is cancelled in accordance with Section 1, the deposit will be refunded as applicable. If the
          customer cancels within 24 hours or no-shows, the deposit may be forfeited. Specific deposit terms are
          disclosed at checkout.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Dispute Review Process</h2>
        <p>
          Disputes regarding service quality, non-performance, or other booking-related issues must be reported within
          <span className="font-medium"> 7 days</span> of service completion. To report a dispute, contact support at
          hello.flyersup@gmail.com or use the in-app dispute tools. Include your booking ID, a description of the
          issue, and any supporting documentation.
        </p>
        <p>
          Flyers Up will review disputes in good faith and may request additional information from both parties. Our
          resolution decisions are final. We may issue refunds, partial refunds, or credits at our discretion based on
          the circumstances. We are not obligated to resolve disputes in any particular manner.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Flyers Up Protection &amp; Service Fee</h2>
        <p>
          The Flyers Up Protection &amp; Service Fee is generally non-refundable except where required by applicable law
          (e.g., when a Pro cancels or when we determine a full refund is appropriate). Processing fees charged by our
          Payment Processor may also be non-refundable.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Modifications</h2>
        <p>
          We may modify this policy from time to time. Material changes will be posted with an updated &quot;Last Updated&quot;
          date. Continued use after changes indicates acceptance. For existing bookings, the policy in effect at the
          time of booking applies.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Contact</h2>
        <p>
          For refund or cancellation questions: Flyers Up LLC — hello.flyersup@gmail.com
        </p>
        <p className="text-muted">
          For legal disputes with Flyers Up, see our <Link href="/legal/arbitration" className="underline hover:text-text">Dispute Resolution and Arbitration Policy</Link>.
        </p>
      </div>
    </LegalPageShell>
  );
}
