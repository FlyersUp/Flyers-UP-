import Link from 'next/link';

const TERMS_VERSION = '2026-01-27';

export const metadata = {
  title: 'Terms of Service — Flyers Up',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-solid)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-text hover:opacity-90">
            Flyers Up
          </Link>
          <div className="text-xs text-muted">Terms v{TERMS_VERSION}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Terms of Service</h1>
        <div className="mt-2 text-sm text-muted">
          <div>
            <span className="font-medium text-text">Effective Date:</span> January 27, 2026
          </div>
          <div>
            <span className="font-medium text-text">Last Updated:</span> January 27, 2026
          </div>
        </div>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
          <p>
            These Terms of Service (“<span className="font-medium">Terms</span>”) govern your access to and use of the Flyers Up
            website, mobile application, and related services (collectively, the “<span className="font-medium">Platform</span>”),
            operated by Flyers Up LLC (“<span className="font-medium">Flyers Up</span>,” “we,” “our,” or “us”). By accessing or
            using the Platform, you agree to be bound by these Terms. <span className="font-medium">If you do not agree, do not use the Platform.</span>
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">1. Definitions</h2>
          <ul className="list-disc pl-5 space-y-1 text-text">
            <li>
              <span className="font-medium">Customer</span> means a user who requests or books services through the Platform.
            </li>
            <li>
              <span className="font-medium">Pro</span> means an independent service provider offering services through the Platform.
            </li>
            <li>
              <span className="font-medium">Booking</span> means a service request accepted by a Pro through the Platform.
            </li>
            <li>
              <span className="font-medium">Content</span> means any text, images, videos, reviews, messages, listings, or other materials submitted
              through or displayed on the Platform.
            </li>
            <li>
              <span className="font-medium">Fees</span> means platform fees, service fees, processing fees, cancellation fees, or other charges disclosed
              to you at checkout or otherwise within the Platform.
            </li>
            <li>
              <span className="font-medium">Payment Processor</span> means third-party payment providers, including Stripe, used to process payments and payouts.
            </li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">2. Platform Role; No Employment Relationship</h2>
          <p>
            Flyers Up is a technology marketplace that facilitates connections between Customers and Pros. Flyers Up does not provide the services performed
            by Pros and does not supervise, direct, or control Pros’ work. Pros are independent contractors and are not employees, agents, partners, joint
            venturers, or representatives of Flyers Up. Any service agreement is solely between the applicable Customer and Pro. Flyers Up is not a party to any
            such agreement.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">3. Eligibility; Accounts</h2>
          <p>
            You must be at least 18 years old to use the Platform. You are responsible for maintaining accurate account information, safeguarding credentials,
            and all activity occurring under your account. We may suspend or terminate your access to the Platform if we reasonably believe you have violated
            these Terms, engaged in fraud or misconduct, or created legal, compliance, or safety risk.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">4. Bookings; Services</h2>
          <p>
            Customers may submit service requests through the Platform. Pros may accept or decline requests in their sole discretion. Acceptance creates a Booking
            between the Customer and the Pro. Flyers Up does not guarantee that a request will be accepted, that a Pro will be available, or that any service
            outcome will meet expectations.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">5. Payments; Charges; Payouts</h2>
          <h3 className="text-base font-semibold tracking-tight">5.1 Customer Charges</h3>
          <p>
            By submitting a Booking request, you authorize Flyers Up (via the Payment Processor) to charge your selected payment method when the Booking is
            accepted, or as otherwise disclosed at checkout or within the Platform. Charges may be authorized at acceptance and captured immediately or after
            service completion, as disclosed at checkout. The timing and method of authorization or capture may change as platform features evolve, as disclosed
            to you.
          </p>
          <p>
            Fees will be disclosed prior to charge. Platform Fees are non-refundable except where required by applicable law.
          </p>

          <h3 className="text-base font-semibold tracking-tight">5.2 Pro Payouts</h3>
          <p>
            Payouts to Pros are processed through Stripe Connect (or a similar Payment Processor integration). Payout timing is not guaranteed and may be delayed
            or withheld due to, without limitation: Payment Processor rules, verification/compliance reviews, disputes, chargebacks, suspected fraud, risk controls,
            or other integrity or legal requirements. Flyers Up may, to the extent permitted by law and Payment Processor rules, hold, reverse, offset, or adjust
            payouts to resolve disputes, satisfy refunds, address chargebacks, mitigate fraud, or enforce these Terms and related policies.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">6. Cancellations; No-Shows; Refunds; Disputes</h2>
          <p className="text-muted">
            Important: Refund eligibility may depend on timing and circumstances and may be further described at checkout.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium">Cancellation window (Customer):</span> Cancel at least <span className="font-medium">24 hours</span> before the scheduled
              service time to be eligible for a refund of the service amount paid, excluding Fees. Platform Fees are non-refundable except where required by law.
            </li>
            <li>
              <span className="font-medium">Late cancellations:</span> Cancellations within 24 hours may result in a partial refund or no refund, as determined by
              Flyers Up in accordance with its then-current policies and the information disclosed at checkout.
            </li>
            <li>
              <span className="font-medium">No-shows:</span> Customer no-show: no refund (except where required by law). Pro no-show: refund or credit may be issued
              at Flyers Up’s discretion.
            </li>
            <li>
              <span className="font-medium">Disputes:</span> Must be reported within <span className="font-medium">7 days</span> of service completion. Approved refunds,
              if any, are returned to the original payment method unless otherwise required by law or Payment Processor rules.
            </li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">7. Verification; Background Checks; Coverage Disclaimers</h2>
          <p>
            Flyers Up may offer verification, credential uploads, identity checks, or third-party screening. Verification may include document review and/or third-party
            checks. Flyers Up does not independently guarantee authenticity or accuracy unless explicitly stated. Verification, badges, ratings, or trust indicators do
            not guarantee quality, safety, legality, or performance. Users are solely responsible for conducting their own due diligence. Any coverage, shield, protection,
            or insurance feature may not be available in all locations, may be provided by third parties, and is governed by separate terms.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">8. User-Generated Content; License; Removal</h2>
          <p>
            You retain ownership of your Content as between you and Flyers Up. By submitting Content, you grant Flyers Up a worldwide, non-exclusive, royalty-free,
            sublicensable, and transferable license to host, store, reproduce, modify (for formatting), display, distribute, and otherwise use such Content to operate,
            improve, and promote the Platform and Flyers Up services. Where feasible, you may revoke marketing use by deleting the applicable Content; however, Content
            may persist in backups or where retention is required for legal, security, or operational purposes. Flyers Up may remove or restrict Content that violates
            these Terms, policies, or applicable law.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">9. Intellectual Property; DMCA</h2>
          <p>
            If you believe content infringes your copyright, submit a complaint to <span className="font-medium">hello.flyersup@gmail.com</span> and include identification
            of the copyrighted work and the allegedly infringing material, along with sufficient information to locate it. Flyers Up may remove allegedly infringing content
            and may terminate repeat infringers where appropriate.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">10. Prohibited Conduct</h2>
          <p>
            You agree not to circumvent platform fees or solicit off-platform payments; commit fraud, misrepresentation, or impersonation; scrape, reverse engineer, interfere
            with, or abuse the Platform; harass, threaten, defame, or discriminate; upload false credentials, misleading listings, or fraudulent reviews; or violate applicable
            laws or regulations. Violations may result in suspension or permanent removal.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">11. Safety; Emergencies</h2>
          <p>
            The Platform is not intended for emergency services. If you need immediate assistance, call 911 or local emergency services.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">12. Arbitration Agreement; Class Action Waiver</h2>
          <p className="text-muted">
            PLEASE READ THIS SECTION CAREFULLY. It affects your legal rights.
          </p>
          <p>
            Except as set forth below, any dispute, claim, or controversy arising out of or relating to these Terms or the Platform shall be resolved by binding arbitration
            administered by the American Arbitration Association (AAA) under its applicable rules. Either party may bring an individual claim in small claims court if it qualifies,
            or seek injunctive relief for unauthorized use of intellectual property. Arbitration shall take place in New York, NY, unless the parties agree otherwise. Arbitration fees
            and costs will be allocated in accordance with the administrator’s rules and applicable law. You and Flyers Up agree that disputes will be brought only in an individual
            capacity and not as a plaintiff or class member in any purported class, collective, or representative proceeding.
          </p>
          <p>
            <span className="font-medium">Opt-Out:</span> You may opt out of arbitration within 30 days of account creation by emailing hello.flyersup@gmail.com with your name and
            account email and a clear request to opt out of arbitration, or by mailing written notice to the address listed below.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">13. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of New York, without regard to conflict-of-law principles.</p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">14. Electronic Communications</h2>
          <p>You consent to receive notices and communications electronically via email and/or in-app notifications.</p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">15. Disclaimers; Limitation of Liability</h2>
          <p>
            The Platform is provided “AS IS” and “AS AVAILABLE.” To the maximum extent permitted by law, Flyers Up disclaims all warranties, express or implied, including
            merchantability, fitness for a particular purpose, and non-infringement. Flyers Up does not warrant that the Platform will be uninterrupted, secure, or error-free.
          </p>
          <p>
            To the maximum extent permitted by law: (i) Flyers Up shall not be liable for any indirect, incidental, special, consequential, or punitive damages; and (ii) Flyers Up’s
            total liability for all claims shall not exceed the platform fees paid to Flyers Up in the prior 12 months.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">16. Miscellaneous</h2>
          <p>
            Severability: invalid provisions do not affect the rest. Assignment: Flyers Up may assign these Terms; you may not assign without written consent. Entire Agreement:
            these Terms constitute the entire agreement. No Waiver: failure to enforce is not a waiver. Third-Party Beneficiaries: none.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">17. Contact</h2>
          <p>
            Flyers Up LLC — <span className="font-medium">hello.flyersup@gmail.com</span>
          </p>
          <p className="text-muted">Mailing Address: c/o Registered Agent (mailing address on file)</p>
        </div>
      </main>
    </div>
  );
}

