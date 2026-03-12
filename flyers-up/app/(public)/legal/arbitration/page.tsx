import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Dispute Resolution and Arbitration Policy — Flyers Up',
};

export default function ArbitrationPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Dispute Resolution and Arbitration Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p className="font-medium text-muted">
          PLEASE READ THIS POLICY CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO A JURY TRIAL AND
          YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION.
        </p>
        <p>
          This Dispute Resolution and Arbitration Policy (&quot;Policy&quot;) governs how disputes between you and Flyers Up LLC
          (&quot;Flyers Up,&quot; &quot;we,&quot; or &quot;us&quot;) are resolved. This Policy is incorporated by reference into our Terms of
          Service. By using the Platform, you agree to this Policy.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Informal Resolution</h2>
        <p>
          Before initiating arbitration, you agree to contact us at hello.flyersup@gmail.com and attempt to resolve the
          dispute informally. We will attempt to resolve the dispute within 30 days. If the dispute is not resolved
          within 30 days, either party may proceed to arbitration as set forth below.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Mandatory Arbitration</h2>
        <p>
          Except as set forth in Section 4 below, any dispute, claim, or controversy arising out of or relating to these
          Terms, the Platform, or the relationship between you and Flyers Up shall be resolved exclusively by binding
          arbitration administered by the American Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration Rules
          (or, if you are a business, the Commercial Arbitration Rules), as modified by this Policy.
        </p>
        <p>
          The arbitrator shall have exclusive authority to resolve any dispute relating to the interpretation,
          applicability, or enforceability of this arbitration agreement. The arbitration shall be conducted in New
          York, NY, unless the parties agree otherwise. The arbitrator&apos;s decision shall be final and binding.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Class Action Waiver</h2>
        <p>
          YOU AND FLYERS UP AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS
          A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING. The arbitrator
          may not consolidate more than one person&apos;s claims and may not preside over any form of representative or
          class proceeding. If this class action waiver is found to be unenforceable, then the entire arbitration
          agreement shall be null and void.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Exceptions</h2>
        <p>
          The following are not subject to arbitration: (a) claims that qualify for small claims court; (b) claims for
          injunctive or other equitable relief for intellectual property infringement; (c) claims that cannot be
          arbitrated as a matter of law. Either party may bring an individual claim in small claims court if it qualifies
          under applicable law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Arbitration Fees and Costs</h2>
        <p>
          Arbitration fees and costs will be allocated in accordance with the AAA&apos;s rules and applicable law. For
          consumer disputes, we will pay the arbitration filing fee and arbitrator&apos;s fees to the extent required by the
          AAA Consumer Arbitration Rules. Each party shall bear its own attorneys&apos; fees unless the arbitrator awards
          them.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Opt-Out</h2>
        <p>
          You may opt out of this arbitration agreement within 30 days of the date you first accepted the Terms of Service
          (or, if you are a Pro, the date you first accepted the Independent Contractor Agreement). To opt out, you must
          send a written notice to hello.flyersup@gmail.com that includes: (a) your name; (b) your account email; (c)
          your mailing address; and (d) a clear statement that you opt out of the arbitration agreement. You may also
          mail written notice to our registered agent. If you validly opt out, the arbitration agreement will not apply
          to you, but the rest of the Terms will remain in effect.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Governing Law</h2>
        <p>
          This Policy and any arbitration shall be governed by the laws of the State of New York, without regard to
          conflict-of-law principles. The place of arbitration shall be New York County, New York.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Disputes Between Users</h2>
        <p>
          This Policy governs disputes between you and Flyers Up. Disputes between users (e.g., between a Customer and a
          Pro) are solely between those users. Flyers Up is not a party to such disputes and has no obligation to
          resolve them. Our <Link href="/legal/refunds" className="underline hover:text-text">Refund and Cancellation Policy</Link> describes
          how we may assist with booking-related disputes.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Contact</h2>
        <p>Flyers Up LLC — hello.flyersup@gmail.com</p>
      </div>
    </LegalPageShell>
  );
}
