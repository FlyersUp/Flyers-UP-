import Link from 'next/link';
import { LegalPageShell } from '@/components/LegalPageShell';

export const metadata = {
  title: 'Refund Policy — Flyers Up',
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell>
        <h1 className="text-2xl font-semibold tracking-tight">Refund Policy</h1>
        <p className="mt-2 text-sm text-muted">Plain-English summary. This page mirrors Section 6 of the Terms of Service.</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">Cancellation window (Customer)</div>
            <div className="mt-2 text-muted">
              Cancel at least <span className="font-medium text-text">24 hours</span> before the scheduled service time to be eligible for a refund of the service amount paid,
              excluding Fees. Platform Fees are non-refundable except where required by law.
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">Late cancellations</div>
            <div className="mt-2 text-muted">
              Cancellations within 24 hours may result in a partial refund or no refund, depending on our then-current policies and what was disclosed at checkout.
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">No-shows</div>
            <div className="mt-2 text-muted">
              Customer no-show: no refund (except where required by law). Pro no-show: you may receive a refund or credit.
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">Disputes</div>
            <div className="mt-2 text-muted">
              Report disputes within <span className="font-medium text-text">7 days</span> of service completion. Approved refunds (if any) are returned to the original payment
              method unless otherwise required by law or Payment Processor rules.
            </div>
          </div>

          <div className="text-xs text-muted/70">
            For the binding terms, see{' '}
            <Link href="/terms" className="underline hover:text-text">
              Terms of Service
            </Link>
            .
          </div>
        </div>
    </LegalPageShell>
  );
}

