import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Acceptable Use Policy — Flyers Up',
};

export default function AcceptableUsePage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Acceptable Use Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Acceptable Use Policy (&quot;AUP&quot;) defines prohibited uses of the Flyers Up platform. By using the Platform,
          you agree to comply with this AUP. Violations may result in suspension or termination of your account. This
          AUP is incorporated by reference into our Terms of Service.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Prohibited: Scraping and Automated Access</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Scrape, crawl, spider, or use automated means to access, collect, or extract data from the Platform</li>
          <li>Use bots, scripts, or other automated tools to interact with the Platform without our express permission</li>
          <li>Attempt to circumvent rate limits, access controls, or technical restrictions</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Prohibited: Reverse Engineering</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Platform</li>
          <li>Modify, adapt, or create derivative works of the Platform without authorization</li>
          <li>Interfere with or disrupt the integrity or performance of the Platform</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Prohibited: Spam and Abuse</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Send unsolicited messages, spam, or bulk communications</li>
          <li>Use the Platform to distribute malware, viruses, or harmful code</li>
          <li>Engage in activities that overload or impair the Platform&apos;s infrastructure</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Prohibited: Fraud</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Commit fraud, misrepresentation, or impersonation</li>
          <li>Use stolen or fraudulent payment methods</li>
          <li>Create fake accounts, reviews, or bookings</li>
          <li>Circumvent the Flyers Up Protection &amp; Service Fee or solicit off-platform payments</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Prohibited: Illegal Activities</h2>
        <p>
          You may not use the Platform for any illegal purpose or in violation of any applicable local, state, federal,
          or international law. You may not offer, facilitate, or request illegal services. Flyers Up will cooperate
          with law enforcement regarding illegal activity.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Prohibited: Harmful Content</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload or transmit content that is defamatory, obscene, harassing, threatening, or discriminatory</li>
          <li>Infringe the intellectual property rights of others</li>
          <li>Violate the privacy or publicity rights of others</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Prohibited: Security Violations</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Attempt to gain unauthorized access to the Platform, other accounts, or systems</li>
          <li>Probe, scan, or test the vulnerability of the Platform</li>
          <li>Circumvent authentication or access controls</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Enforcement</h2>
        <p>
          Flyers Up reserves the right to investigate suspected violations and to take appropriate action, including
          warnings, suspension, termination, removal of content, and reporting to law enforcement. We may cooperate
          with law enforcement and may disclose user information as required by law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Related Policies</h2>
        <p>
          This AUP supplements our <Link href="/legal/guidelines" className="underline hover:text-text">Community Guidelines</Link> and
          Terms of Service. In the event of conflict, the Terms of Service control.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Contact</h2>
        <p>
          To report platform abuse: sign in and use in-app reporting where available, email Flyers Up LLC at
          support@flyersup.app, or submit a signed-in support ticket from <Link href="/support" className="underline hover:text-text">/support</Link>. Flyers Up does not guarantee response times or outcomes.
        </p>
      </div>
    </LegalPageShell>
  );
}
