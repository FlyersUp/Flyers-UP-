import { LegalPageShell } from '@/components/LegalPageShell';

const TERMS_VERSION = '2026-03-11';

export const metadata = {
  title: 'Terms of Service — Flyers Up',
};

export default function LegalTermsPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Terms v{TERMS_VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Terms of Service</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Flyers Up LLC
          (&quot;Flyers Up,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) governing your access to and use of the Flyers Up website,
          mobile application, and related services (collectively, the &quot;Platform&quot;). By accessing or using the Platform,
          you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these
          Terms, you may not access or use the Platform.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Definitions</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Customer</span> means a user who requests, books, or pays for services through the Platform.</li>
          <li><span className="font-medium">Pro</span> means an independent service provider who offers and performs services through the Platform.</li>
          <li><span className="font-medium">Booking</span> means a service request accepted by a Pro through the Platform, creating a direct agreement between the Customer and the Pro.</li>
          <li><span className="font-medium">Content</span> means any text, images, videos, reviews, messages, listings, or other materials submitted through or displayed on the Platform.</li>
          <li><span className="font-medium">Fees</span> means the Flyers Up Protection &amp; Service Fee, processing fees, cancellation fees, or other charges disclosed at checkout or within the Platform.</li>
          <li><span className="font-medium">Payment Processor</span> means third-party payment providers, including Stripe, used to process payments and payouts.</li>
          <li><span className="font-medium">Services</span> means the services performed by Pros for Customers, which are not provided by Flyers Up.</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Platform Role; No Employment Relationship</h2>
        <p>
          Flyers Up is a technology platform that connects Customers with independent service providers. Flyers Up is not a
          service provider, employer, staffing agency, or agent of any Pro or Customer. Flyers Up does not employ, supervise,
          direct, or control the work of Pros. Pros are independent contractors who operate their own businesses and are not
          employees, agents, partners, joint venturers, or representatives of Flyers Up.
        </p>
        <p>
          Any service agreement is solely between the applicable Customer and Pro. Flyers Up is not a party to any such
          agreement and is not responsible for the quality, safety, legality, or performance of services performed by Pros.
          Flyers Up does not guarantee that any Pro is qualified, licensed, insured, or suitable for any particular service.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Eligibility; Account Registration</h2>
        <p>
          You must be at least 18 years old and have the legal capacity to enter into binding contracts to use the Platform.
          You represent and warrant that all information you provide during registration is accurate, current, and complete.
          You are responsible for maintaining the confidentiality of your account credentials and for all activity occurring
          under your account.
        </p>
        <p>
          We may suspend or terminate your access to the Platform at any time, with or without cause or notice, if we
          reasonably believe you have violated these Terms, engaged in fraud or misconduct, or created legal, compliance, or
          safety risk. We reserve the right to refuse service to anyone for any lawful reason.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Bookings; Services</h2>
        <p>
          Customers may submit service requests through the Platform. Pros may accept or decline requests in their sole
          discretion. Acceptance creates a Booking between the Customer and the Pro. Flyers Up does not guarantee that a
          request will be accepted, that a Pro will be available, or that any service outcome will meet expectations. All
          services are performed by Pros; Flyers Up does not perform any services.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Payments; Fees; Payouts</h2>
        <p>
          By submitting a Booking request, you authorize Flyers Up (via the Payment Processor) to charge your selected
          payment method. Charges may be authorized at acceptance and captured immediately or after service completion, as
          disclosed at checkout.           Fees will be disclosed prior to charge. The Flyers Up Protection &amp; Service Fee is non-refundable except where
          required by applicable law.
        </p>
        <p>
          Payouts to Pros are processed through Stripe Connect. Payout timing is not guaranteed and may be delayed or withheld
          due to Payment Processor rules, verification reviews, disputes, chargebacks, suspected fraud, or other requirements.
          Flyers Up may hold, reverse, offset, or adjust payouts to resolve disputes, satisfy refunds, address chargebacks,
          mitigate fraud, or enforce these Terms.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Cancellations; Refunds</h2>
        <p>
          Cancellation and refund terms are set forth in our Refund and Cancellation Policy, which is incorporated by
          reference.           Refund eligibility may depend on timing and circumstances. The Protection &amp; Service Fee is non-refundable except
          where required by law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — User-Generated Content; License; Removal</h2>
        <p>
          You retain ownership of your Content. By submitting Content, you grant Flyers Up a worldwide, non-exclusive,
          royalty-free, sublicensable, and transferable license to host, store, reproduce, modify, display, distribute,
          and use such Content to operate and promote the Platform. Flyers Up may remove or restrict Content that violates
          these Terms, our policies, or applicable law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Prohibited Conduct</h2>
        <p>
          You agree not to: circumvent the Flyers Up Protection &amp; Service Fee or solicit off-platform payments; commit fraud, misrepresentation, or
          impersonation; scrape, reverse engineer, interfere with, or abuse the Platform; harass, threaten, defame, or
          discriminate; upload false credentials or fraudulent reviews; or violate applicable laws. Violations may result in
          suspension or permanent removal. Our Community Guidelines and Acceptable Use Policy provide additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; FLYERS UP
          DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. FLYERS UP DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW: (i) FLYERS UP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES; AND (ii) FLYERS UP&apos;S TOTAL LIABILITY FOR ALL CLAIMS SHALL NOT EXCEED THE
          PLATFORM FEES PAID TO FLYERS UP IN THE PRIOR TWELVE (12) MONTHS. FLYERS UP IS NOT LIABLE FOR THE ACTS, ERRORS,
          OMISSIONS, OR CONDUCT OF USERS, INCLUDING PROS.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Flyers Up, its affiliates, officers, directors, employees,
          and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable
          attorneys&apos; fees) arising out of or related to: (a) your use of the Platform; (b) your violation of these Terms;
          (c) your Content; (d) your violation of any third-party rights; or (e) any dispute between you and another user.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 11 — Arbitration; Class Action Waiver</h2>
        <p className="text-muted font-medium">PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.</p>
        <p>
          Except as set forth below, any dispute, claim, or controversy arising out of or relating to these Terms or the
          Platform shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under
          its Consumer Arbitration Rules. Either party may bring an individual claim in small claims court if it qualifies, or
          seek injunctive relief for intellectual property infringement. Arbitration shall take place in New York, NY.
        </p>
        <p>
          YOU AND FLYERS UP AGREE THAT DISPUTES WILL BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR
          CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
        </p>
        <p>
          <span className="font-medium">Opt-Out:</span> You may opt out of arbitration within 30 days of account creation by
          emailing support@flyersup.app with your name, account email, and a clear request to opt out of arbitration.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 12 — Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of New York, without regard to conflict-of-law principles. Any
          arbitration or legal proceeding shall be conducted in New York County, New York.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 13 — Termination</h2>
        <p>
          You may terminate your account at any time. We may suspend or terminate your access immediately, with or without
          notice, for any reason. Upon termination, your right to use the Platform ceases. Provisions that by their nature
          should survive termination shall survive, including indemnification, limitation of liability, and arbitration.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 14 — Miscellaneous</h2>
        <p>
          Severability: If any provision is held invalid, the remainder remains in effect. Assignment: Flyers Up may assign
          these Terms; you may not assign without written consent. Entire Agreement: These Terms, together with our Privacy
          Policy and other incorporated policies, constitute the entire agreement. No Waiver: Failure to enforce is not a
          waiver. Third-Party Beneficiaries: None.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 15 — Contact</h2>
        <p>
          Flyers Up LLC — support@flyersup.app
        </p>
        <p className="text-muted">Mailing Address: c/o Registered Agent (mailing address on file)</p>
      </div>
    </LegalPageShell>
  );
}
