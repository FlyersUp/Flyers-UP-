import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-17';

export const metadata = {
  title: 'Data Processing Agreement — Flyers Up',
};

export default function DataProcessingAgreementPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Agreement v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Data Processing Agreement</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 17, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 17, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) describes how Flyers Up LLC (&quot;Flyers Up,&quot; &quot;we,&quot; &quot;our,&quot; or
          &quot;us&quot;) processes personal data in connection with the Flyers Up platform. It is intended to provide
          transparency to users and, where applicable, to address requirements under data protection laws. This DPA is
          incorporated by reference into our <Link href="/legal/terms" className="underline hover:text-text">Terms of Service</Link> and{' '}
          <Link href="/legal/privacy" className="underline hover:text-text">Privacy Policy</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Definitions</h2>
        <p>For purposes of this DPA, the following terms have the meanings set forth below:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Personal Data</span> means any information relating to an identified or identifiable natural person.</li>
          <li><span className="font-medium">Data Subject</span> means the identified or identifiable natural person to whom Personal Data relates.</li>
          <li><span className="font-medium">Processing</span> means any operation performed on Personal Data, including collection, storage, use, disclosure, transmission, or deletion.</li>
          <li><span className="font-medium">Controller</span> means the entity that determines the purposes and means of Processing. Flyers Up acts as a Controller with respect to Personal Data processed to operate the Platform.</li>
          <li><span className="font-medium">Processor</span> means an entity that Processes Personal Data on behalf of a Controller. Where Flyers Up engages subprocessors, those subprocessors act as Processors.</li>
          <li><span className="font-medium">Platform</span> means the Flyers Up marketplace platform, including websites, applications, and related services.</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Scope of Processing</h2>
        <p>
          Flyers Up Processes Personal Data to operate the Flyers Up marketplace platform, which connects local service
          professionals (&quot;Pros&quot;) with customers for services such as cleaning, handyman work, tutoring, moving, and other
          local services. This DPA applies to all Personal Data Processed by Flyers Up in connection with the Platform,
          whether collected directly from users or from third parties.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Categories of Data Collected</h2>
        <p>Flyers Up may collect and Process the following categories of Personal Data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Account information:</span> Name, email address, phone number, password (hashed), and account preferences.</li>
          <li><span className="font-medium">Contact details:</span> Mailing address, billing address, and other contact information provided by users.</li>
          <li><span className="font-medium">Identity verification data:</span> Government-issued identification, date of birth, and related information used for identity verification or background screening.</li>
          <li><span className="font-medium">Payment data:</span> Payment method information, billing details, and transaction history. Payment card data is processed by our payment processor; we do not store full card numbers.</li>
          <li><span className="font-medium">Booking details:</span> Service requests, scheduling information, service addresses, and booking history.</li>
          <li><span className="font-medium">Communications between users:</span> Messages exchanged through the Platform, support tickets, and feedback.</li>
          <li><span className="font-medium">Profile and business information:</span> Photos, bios, service descriptions, licenses, certifications, and insurance information.</li>
          <li><span className="font-medium">Device and usage data:</span> IP address, device type, browser, log data, and analytics data.</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Purpose of Processing</h2>
        <p>Personal Data is Processed for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operating and maintaining the Platform, including facilitating bookings and communications between Pros and customers</li>
          <li>Processing payments, payouts, and related financial transactions</li>
          <li>Preventing fraud, abuse, and unauthorized access</li>
          <li>Ensuring trust and safety, including identity verification and background screening</li>
          <li>Providing customer support and resolving disputes</li>
          <li>Improving the Platform through analytics and product development</li>
          <li>Complying with legal obligations and enforcing our terms and policies</li>
          <li>Communicating with users about the Platform, bookings, and account matters</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Data Security Measures</h2>
        <p>
          Flyers Up implements industry-standard administrative, technical, and physical safeguards to protect Personal
          Data. These measures include, but are not limited to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Encryption:</span> Encryption in transit (TLS) and at rest where applicable</li>
          <li><span className="font-medium">Access controls:</span> Role-based access, authentication requirements, and principle of least privilege</li>
          <li><span className="font-medium">Monitoring:</span> Logging, monitoring, and incident response procedures</li>
          <li><span className="font-medium">Secure infrastructure:</span> Hosting and infrastructure provided by reputable providers with security certifications</li>
          <li><span className="font-medium">Vendor assessment:</span> Evaluation of subprocessors&apos; security practices where appropriate</li>
        </ul>
        <p>
          No system is completely secure. Flyers Up will notify affected users and relevant authorities of data breaches
          as required by applicable law. See our <Link href="/legal/security" className="underline hover:text-text">Data Security Policy</Link> for additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Subprocessors</h2>
        <p>
          Flyers Up may engage third-party subprocessors to Process Personal Data in connection with the Platform.
          Subprocessors are selected based on their ability to meet our security and compliance requirements. Categories
          of subprocessors include:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Cloud hosting providers:</span> Infrastructure and application hosting</li>
          <li><span className="font-medium">Payment processors:</span> Payment processing, payouts, and related financial services</li>
          <li><span className="font-medium">Identity verification services:</span> Identity verification and background screening</li>
          <li><span className="font-medium">Analytics tools:</span> Performance monitoring, analytics, and product improvement</li>
          <li><span className="font-medium">Communication services:</span> Email, notifications, and customer support tools</li>
          <li><span className="font-medium">Database and authentication services:</span> Data storage and user authentication</li>
        </ul>
        <p>
          Subprocessors are bound by contractual obligations to protect Personal Data and Process it only in accordance
          with our instructions. Flyers Up remains responsible for subprocessor compliance with this DPA. We may update
          our list of subprocessors from time to time; material changes will be reflected in our Privacy Policy or
          through other appropriate notice.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — International Transfers</h2>
        <p>
          Flyers Up operates primarily in the United States. Personal Data may be Processed in jurisdictions outside the
          country in which you reside, including the United States. When we transfer Personal Data across borders, we
          implement appropriate safeguards as required by applicable law, which may include standard contractual clauses,
          adequacy decisions, or other mechanisms recognized by relevant data protection authorities. By using the
          Platform, users in jurisdictions outside the United States consent to the transfer of their Personal Data to
          the United States and other jurisdictions where our subprocessors operate.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Data Subject Rights</h2>
        <p>
          Data Subjects may exercise the following rights with respect to their Personal Data, subject to applicable
          law and any limitations necessary for legal or operational purposes:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Access:</span> Request a copy of Personal Data we hold about you</li>
          <li><span className="font-medium">Correction:</span> Request correction of inaccurate or incomplete Personal Data</li>
          <li><span className="font-medium">Deletion:</span> Request deletion of Personal Data, subject to retention requirements</li>
          <li><span className="font-medium">Restriction:</span> Request restriction of Processing in certain circumstances</li>
          <li><span className="font-medium">Portability:</span> Request transfer of Personal Data in a structured, machine-readable format where applicable</li>
          <li><span className="font-medium">Objection:</span> Object to Processing based on legitimate interests or for direct marketing</li>
        </ul>
        <p>
          To exercise these rights, contact support@flyersup.app. We will respond within the timeframes required by
          applicable law. We may require verification of identity before processing requests. You may also have the
          right to lodge a complaint with a supervisory authority in your jurisdiction.
        </p>
        <p>
          California residents may have additional rights under the CCPA/CPRA. See our{' '}
          <Link href="/legal/privacy" className="underline hover:text-text">Privacy Policy</Link> for details.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Data Retention</h2>
        <p>
          Flyers Up retains Personal Data only as long as necessary for the purposes described in this DPA, including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operating the Platform and providing services</li>
          <li>Complying with legal obligations (e.g., tax, financial, and regulatory requirements)</li>
          <li>Resolving disputes and enforcing our terms</li>
          <li>Establishing, exercising, or defending legal claims</li>
        </ul>
        <p>
          Retention periods vary by data type. Account data is retained while the account is active and for a reasonable
          period thereafter. Booking and payment records may be retained for seven years or as required by law. When
          Personal Data is no longer necessary, we delete or anonymize it in accordance with our data retention
          procedures.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Breach Notification</h2>
        <p>
          In the event of a personal data breach that is likely to result in a risk to the rights and freedoms of
          natural persons, Flyers Up will notify affected Data Subjects and relevant supervisory authorities as
          required by applicable law. Notification will be made without undue delay and will include, to the extent
          practicable, the nature of the breach, the categories and approximate number of Data Subjects affected, the
          likely consequences, and the measures taken or proposed to address the breach. Flyers Up will document all
          breaches and the response thereto.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 11 — Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Flyers Up&apos;s liability arising from or related to the
          Processing of Personal Data under this DPA is subject to the limitations of liability set forth in our{' '}
          <Link href="/legal/terms" className="underline hover:text-text">Terms of Service</Link>. Nothing in this DPA
          excludes or limits liability that cannot be excluded or limited under applicable law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 12 — Governing Law</h2>
        <p>
          This DPA is governed by the laws of the State of Delaware, United States, without regard to conflict of law
          principles. Any disputes arising from or related to this DPA shall be resolved in accordance with the dispute
          resolution provisions of our Terms of Service, including the arbitration agreement set forth in our{' '}
          <Link href="/legal/arbitration" className="underline hover:text-text">Arbitration Policy</Link>. Where
          applicable data protection law requires a different governing law or forum for data protection matters, such
          requirements shall apply to the extent necessary.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 13 — Updates</h2>
        <p>
          Flyers Up may update this DPA from time to time to reflect changes in our practices, the Platform, or
          applicable law. We will notify users of material changes by posting the updated DPA and updating the
          &quot;Last Updated&quot; date. Continued use of the Platform after changes indicates acceptance of the updated DPA.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 14 — Contact</h2>
        <p>
          Questions regarding this DPA or our data processing practices may be directed to: Flyers Up LLC —
          support@flyersup.app
        </p>
      </div>
    </LegalPageShell>
  );
}
