import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Community Guidelines — Flyers Up',
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Guidelines v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Community Guidelines</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          These Community Guidelines (&quot;Guidelines&quot;) describe the standards of conduct we expect from everyone who uses
          the Flyers Up platform. They complement our <Link href="/legal/terms" className="underline hover:text-text">Terms of Service</Link>,
          which remain the binding legal agreement. By using Flyers Up, you agree to follow these Guidelines. Violations
          may result in warnings, suspension, or permanent removal.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Honesty and Professionalism</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use accurate profile information, photos, and service descriptions.</li>
          <li>Do not impersonate others or misrepresent your identity, credentials, or qualifications.</li>
          <li>Pros: Only list services you are qualified and authorized to perform.</li>
          <li>Customers: Provide accurate details when requesting services.</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Prohibited Conduct: Fraud and Misrepresentation</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Commit fraud, misrepresentation, or impersonation</li>
          <li>Upload false credentials, misleading listings, or fraudulent reviews</li>
          <li>Abuse the payment or review systems</li>
          <li>Circumvent the Flyers Up Protection &amp; Service Fee or solicit off-platform payments</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Prohibited Conduct: Harassment and Discrimination</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harass, threaten, defame, or discriminate against anyone</li>
          <li>Communicate in a disrespectful, abusive, or threatening manner</li>
          <li>Violate anyone&apos;s privacy or personal boundaries</li>
          <li>Engage in hate speech or target individuals based on protected characteristics</li>
        </ul>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Prohibited Conduct: Illegal Services</h2>
        <p>
          You may not offer, request, or facilitate any illegal services or activities. All services must comply with
          applicable local, state, and federal laws. Flyers Up will cooperate with law enforcement regarding illegal
          activity.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Prohibited Conduct: Platform Misuse</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Scrape, reverse engineer, interfere with, or abuse the Platform</li>
          <li>Use bots, automated tools, or unauthorized means to access the Platform</li>
          <li>Circumvent security measures or access restrictions</li>
          <li>Post content that violates intellectual property rights or applicable laws</li>
        </ul>
        <p>See our <Link href="/legal/acceptable-use" className="underline hover:text-text">Acceptable Use Policy</Link> for additional detail.</p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Content Standards</h2>
        <p>
          Content must be accurate, lawful, and respectful. Flyers Up may remove content that violates these Guidelines,
          our Terms, or applicable law. We reserve the right to remove content without prior notice.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Safety</h2>
        <p>
          The Platform is not intended for emergency services. If you need immediate assistance, call 911 or local
          emergency services. Users are responsible for their own safety when arranging and performing services.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Enforcement</h2>
        <p>
          Flyers Up reserves the right to investigate suspected violations and to take action including: warnings;
          temporary or permanent suspension; removal of content; and reporting to law enforcement. We may consider
          factors including severity, intent, and history when determining appropriate action. Our decisions are final.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Reporting</h2>
        <p>
          To report violations, contact hello.flyersup@gmail.com or use the in-app reporting tools. We encourage users
          to report conduct that violates these Guidelines.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Contact</h2>
        <p>Flyers Up LLC — hello.flyersup@gmail.com</p>
      </div>
    </LegalPageShell>
  );
}
