import Link from 'next/link';
import { LegalPageShell } from '@/components/LegalPageShell';

const POLICY_VERSION = '2026-03-11';

export const metadata = {
  title: 'Privacy Policy — Flyers Up',
};

export default function LegalPrivacyPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{POLICY_VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Privacy Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Privacy Policy describes how Flyers Up LLC (&quot;Flyers Up,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects, uses,
          shares, and protects information when you use the Flyers Up platform. By using the Platform, you consent to the
          practices described in this policy.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Information We Collect</h2>
        <h3 className="text-base font-semibold tracking-tight pt-2">1.1 Information You Provide</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information: name, email address, phone number, password</li>
          <li>Profile details: photos, bio, service descriptions, business information</li>
          <li>Payment information: processed by Stripe; we do not store full card numbers</li>
          <li>Communications: messages, reviews, support tickets</li>
          <li>Uploaded documents: licenses, certifications, insurance certificates</li>
        </ul>

        <h3 className="text-base font-semibold tracking-tight pt-2">1.2 Information Collected Automatically</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Device and usage data: device type, operating system, browser</li>
          <li>Log data: IP address, access times, pages viewed</li>
          <li>Approximate location inferred from IP address</li>
          <li>Analytics and performance data</li>
        </ul>

        <h3 className="text-base font-semibold tracking-tight pt-2">1.3 Location Data</h3>
        <p>
          Precise location is collected only with your explicit device permission when you enable location-based features.
          Approximate location may be inferred from IP address for security and regional customization.
        </p>

        <h2 id="cookies" className="text-lg font-semibold tracking-tight pt-4">Section 2 — Cookies and Tracking Technologies</h2>
        <p>
          We use cookies and local storage for: authentication and session management; platform functionality; analytics
          and performance; security and fraud prevention. You may control cookies through device or browser settings;
          however, some features may not function properly if cookies are disabled. We do not use cookies for cross-context
          behavioral advertising.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — How We Use Data</h2>
        <p>We use collected information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, operate, and improve the Platform</li>
          <li>Process payments and payouts</li>
          <li>Authenticate users and prevent fraud</li>
          <li>Communicate with you about bookings, account, and support</li>
          <li>Enforce our terms and policies</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Payments:</span> Stripe (payment processing, payouts, Connect)</li>
          <li><span className="font-medium">Authentication &amp; Database:</span> Supabase (auth, data storage)</li>
          <li><span className="font-medium">Hosting:</span> Vercel or similar (application hosting)</li>
          <li><span className="font-medium">Email:</span> Transactional communications</li>
          <li><span className="font-medium">Analytics:</span> Performance, reliability, fraud prevention</li>
          <li><span className="font-medium">Legal/Compliance:</span> Where required by law or to protect rights and safety</li>
        </ul>
        <p>
          We do not sell personal information. We do not share personal information for cross-context behavioral
          advertising.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Data Retention</h2>
        <p>We retain information as follows (unless longer retention is required by law):</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border border-[var(--surface-border)] rounded-xl overflow-hidden">
            <thead className="bg-surface2">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Data Type</th>
                <th className="text-left px-3 py-2 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--hairline)]">
              <tr><td className="px-3 py-2">Account data</td><td className="px-3 py-2">While account is active</td></tr>
              <tr><td className="px-3 py-2">Booking &amp; payment records</td><td className="px-3 py-2">7 years</td></tr>
              <tr><td className="px-3 py-2">Support communications</td><td className="px-3 py-2">As needed for operations</td></tr>
              <tr><td className="px-3 py-2">Logs and analytics</td><td className="px-3 py-2">As needed for security</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Your Rights</h2>
        <p>
          You may request access, correction, or deletion of your information by contacting support@flyersup.app. We
          will respond within 30 days, subject to legal and operational limitations. We may require verification of identity.
        </p>
        <p>
          <span className="font-medium">California (CCPA/CPRA):</span> California residents may have additional rights,
          including the right to know, delete, correct, and opt out of sale (we do not sell personal information).
        </p>
        <p>
          <span className="font-medium">International (GDPR-style):</span> Users in certain jurisdictions may have rights to
          access, rectification, erasure, restriction, portability, and objection. Data may be processed in the United States;
          international users consent to cross-border transfers.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Security</h2>
        <p>
          We implement reasonable administrative, technical, and physical safeguards, including encryption in transit,
          access controls, and monitoring. No system is 100% secure. We will notify users of data breaches as required by
          applicable law. See our <Link href="/legal/security" className="underline hover:text-text">Data Security Policy</Link> for additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Children&apos;s Privacy</h2>
        <p>
          The Platform is not intended for individuals under 18. We do not knowingly collect information from children.
          If you believe we have collected such information, please contact us.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated
          policy and updating the &quot;Last Updated&quot; date. Continued use after changes indicates acceptance.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Contact</h2>
        <p>Flyers Up LLC — support@flyersup.app</p>
        <p className="text-muted">Mailing Address: c/o Registered Agent (mailing address on file)</p>
      </div>
    </LegalPageShell>
  );
}
