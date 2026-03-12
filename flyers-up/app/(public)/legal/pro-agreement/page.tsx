import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Independent Contractor Agreement — Flyers Up',
};

export default function ProAgreementPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Agreement v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Independent Contractor Agreement (Pro Agreement)</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Independent Contractor Agreement (&quot;Pro Agreement&quot;) governs the relationship between Flyers Up LLC (&quot;Flyers Up,&quot;
          &quot;we,&quot; or &quot;us&quot;) and service professionals (&quot;Pros&quot;) who use the Flyers Up platform to connect with customers.
          By registering as a Pro or accepting bookings through the Platform, you agree to be bound by this Pro Agreement.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Independent Contractor Status</h2>
        <p>
          You acknowledge and agree that you are an independent contractor and not an employee, agent, partner, joint
          venturer, or representative of Flyers Up. You operate your own independent business. There is no employment
          relationship between you and Flyers Up. You are solely responsible for determining the manner and means by
          which you perform services for customers.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — No Supervision or Control</h2>
        <p>
          Flyers Up does not supervise, direct, or control your work. Flyers Up does not set your schedule, assign
          specific jobs, or dictate how you perform services. You have the right to accept or decline service requests
          in your sole discretion. You control your own work methods, tools, equipment, and manner of service delivery.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Pricing and Scheduling</h2>
        <p>
          You set your own pricing for services offered through the Platform, subject to Platform requirements. You
          control your own schedule and availability. Flyers Up does not guarantee you any minimum volume of bookings
          or compensation.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Taxes and Benefits</h2>
        <p>
          You are solely responsible for all federal, state, and local taxes arising from your provision of services,
          including income taxes, self-employment taxes, and any other tax obligations. Flyers Up does not withhold
          taxes from your payouts. You are not entitled to any employee benefits from Flyers Up, including but not
          limited to health insurance, retirement benefits, workers&apos; compensation, or unemployment insurance.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Tools and Equipment</h2>
        <p>
          You are responsible for providing your own tools, equipment, supplies, and transportation necessary to perform
          services. Flyers Up does not provide tools, equipment, or materials. You are responsible for maintaining
          any equipment in good working order and for any costs associated with your business operations.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Licenses and Compliance</h2>
        <p>
          You represent and warrant that you hold all licenses, permits, certifications, and authorizations required to
          perform the services you offer. You are solely responsible for complying with all applicable local, state,
          and federal laws, including occupational licensing requirements. Flyers Up does not verify every license or
          certification; see our <Link href="/legal/licensing" className="underline hover:text-text">Licensing and Regulatory Compliance Policy</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Insurance</h2>
        <p>
          You are encouraged to maintain appropriate liability insurance and other business insurance. Flyers Up does not
          provide insurance coverage for your services unless otherwise expressly stated. See our{' '}
          <Link href="/legal/insurance" className="underline hover:text-text">Insurance Recommendation Policy</Link> for
          additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Flyers Up, its affiliates, officers, directors, employees,
          and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable
          attorneys&apos; fees) arising out of or related to: (a) your provision of services; (b) your violation of this
          Agreement or the Terms of Service; (c) your violation of any law or third-party rights; (d) any dispute between
          you and a customer; or (e) any injury, damage, or loss arising from your conduct or services.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Platform Fees</h2>
        <p>
          You agree to pay the platform fees disclosed at the time of each booking. Fees are deducted from payouts. See
          our <Link href="/legal/payments" className="underline hover:text-text">Payment and Platform Fee Policy</Link> for
          details.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Termination</h2>
        <p>
          Either party may terminate this relationship at any time. Flyers Up may suspend or terminate your access to the
          Platform for any reason, including violation of this Agreement or our policies. Upon termination, your right to
          use the Platform ceases. Provisions that by their nature should survive shall survive.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 11 — Incorporation</h2>
        <p>
          The Flyers Up Terms of Service, Privacy Policy, Community Guidelines, and other applicable policies are
          incorporated by reference and apply to your use of the Platform.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 12 — Contact</h2>
        <p>Flyers Up LLC — hello.flyersup@gmail.com</p>
      </div>
    </LegalPageShell>
  );
}
