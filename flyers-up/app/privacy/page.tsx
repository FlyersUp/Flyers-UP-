import Link from 'next/link';

const POLICY_VERSION = '2026-01-27';

export const metadata = {
  title: 'Privacy Policy — Flyers Up',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-solid)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-text hover:opacity-90">
            Flyers Up
          </Link>
          <div className="text-xs text-muted">Policy v{POLICY_VERSION}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Privacy Policy</h1>
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
            This Privacy Policy describes how Flyers Up LLC (“Flyers Up,” “we,” “our,” or “us”) collects, uses, shares, and protects information when you use the Flyers Up
            platform.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">1. Information We Collect</h2>
          <h3 className="text-base font-semibold tracking-tight">1.1 Information You Provide</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, email address, phone number</li>
            <li>Profile details, messages, reviews, listings</li>
            <li>Uploaded documents (e.g., licenses, certifications)</li>
          </ul>

          <h3 className="text-base font-semibold tracking-tight">1.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device and usage data, logs, IP address</li>
            <li>Approximate location inferred from IP</li>
            <li>Analytics and performance data</li>
          </ul>

          <h3 className="text-base font-semibold tracking-tight">1.3 Location Data</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Approximate location may be inferred from IP</li>
            <li>Precise location is collected only with your explicit device permission</li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">2. Cookies &amp; Tracking Technologies</h2>
          <p>
            We use cookies and local storage for authentication and session management, platform functionality, analytics, performance, and security. You may control cookies
            through device or browser settings; however, some features may not function properly if cookies are disabled.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">3. How We Share Data (Categories)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium">Payments:</span> Stripe (payment processing and payouts)
            </li>
            <li>
              <span className="font-medium">Hosting/Auth/Database:</span> Supabase (authentication and data storage)
            </li>
            <li>
              <span className="font-medium">Email Delivery:</span> transactional communications
            </li>
            <li>
              <span className="font-medium">Analytics &amp; Logging:</span> performance, reliability, fraud prevention, and security monitoring
            </li>
            <li>
              <span className="font-medium">Legal/Compliance:</span> where required by law, legal process, or to protect rights, safety, and integrity
            </li>
          </ul>
          <p>
            We do not sell personal information and do not share personal information for cross-context behavioral advertising.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">4. Your Rights</h2>
          <p>
            You may request access, correction, or deletion of your information by contacting <span className="font-medium">hello.flyersup@gmail.com</span>. We will respond
            within 30 days, subject to legal and operational limitations. We may require verification of your identity before fulfilling requests.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">5. Data Retention</h2>
          <p>We retain information as follows (unless longer retention is required by law, tax, accounting, dispute resolution, or security needs):</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm border border-[var(--surface-border)] rounded-xl overflow-hidden">
              <thead className="bg-surface2">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Data Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--hairline)]">
                <tr>
                  <td className="px-3 py-2">Account data</td>
                  <td className="px-3 py-2">While account is active</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Booking &amp; payment records</td>
                  <td className="px-3 py-2">7 years</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Support communications</td>
                  <td className="px-3 py-2">As needed for operations</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold tracking-tight pt-2">6. Security</h2>
          <p>
            We implement reasonable administrative, technical, and physical safeguards, including encryption in transit, access controls, and monitoring. No system is 100% secure.
            We will notify users of data breaches as required by applicable law.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">7. California &amp; International Users</h2>
          <p>
            California residents may have rights under CCPA/CPRA. Data may be processed and stored in the United States. International users consent to cross-border data transfers.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">8. Children’s Privacy</h2>
          <p>The Platform is not intended for individuals under 18, and we do not knowingly collect information from children.</p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">9. Changes</h2>
          <p>We may update this Privacy Policy from time to time. Continued use of the Platform after changes indicates acceptance.</p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">10. Contact</h2>
          <p>
            Flyers Up LLC — <span className="font-medium">hello.flyersup@gmail.com</span>
          </p>
          <p className="text-muted">Mailing Address: c/o Registered Agent (mailing address on file)</p>
        </div>
      </main>
    </div>
  );
}

