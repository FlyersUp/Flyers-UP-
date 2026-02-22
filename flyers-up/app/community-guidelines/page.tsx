import Link from 'next/link';
import { LegalPageShell } from '@/components/LegalPageShell';

const GUIDELINES_VERSION = '2026-02-20';

export const metadata = {
  title: 'Community Guidelines — Flyers Up',
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageShell>
        <div className="text-xs text-muted mb-4">Guidelines v{GUIDELINES_VERSION}</div>
        <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Community Guidelines</h1>
        <div className="mt-2 text-sm text-muted">
          <div>
            <span className="font-medium text-text">Effective Date:</span> February 20, 2026
          </div>
          <div>
            <span className="font-medium text-text">Last Updated:</span> February 20, 2026
          </div>
        </div>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
          <p>
            These Community Guidelines (“<span className="font-medium">Guidelines</span>”) describe the standards of conduct we expect from everyone who uses the Flyers Up
            platform. They complement our{' '}
            <Link href="/terms" className="underline hover:text-text">
              Terms of Service
            </Link>
            , which remain the binding legal agreement. By using Flyers Up, you agree to follow these Guidelines.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">1. Be Honest &amp; Professional</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use accurate profile information, photos, and service descriptions.</li>
            <li>Do not impersonate others or misrepresent your identity, credentials, or qualifications.</li>
            <li>Pros: Only list services you are qualified and authorized to perform.</li>
            <li>Customers: Provide accurate details when requesting services.</li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">2. Respect Others</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not harass, threaten, defame, or discriminate against anyone.</li>
            <li>Communicate respectfully in messages, reviews, and all platform interactions.</li>
            <li>Respect privacy and personal boundaries.</li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">3. Use the Platform Fairly</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not circumvent platform fees or solicit off-platform payments to avoid fees.</li>
            <li>Do not commit fraud, misrepresentation, or abuse of the payment or review systems.</li>
            <li>Do not scrape, reverse engineer, interfere with, or abuse the Platform.</li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">4. Content Standards</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not upload false credentials, misleading listings, or fraudulent reviews.</li>
            <li>Do not post content that violates intellectual property rights or applicable laws.</li>
            <li>Flyers Up may remove content that violates these Guidelines or our Terms.</li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight pt-2">5. Safety</h2>
          <p>
            The Platform is not intended for emergency services. If you need immediate assistance, call 911 or local emergency services.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">6. Consequences</h2>
          <p>
            Violations of these Guidelines may result in warnings, suspension, or permanent removal from the Platform, in accordance with our Terms of Service.
          </p>

          <h2 className="text-lg font-semibold tracking-tight pt-2">7. Contact</h2>
          <p>
            Questions or reports: Flyers Up LLC — <span className="font-medium">hello.flyersup@gmail.com</span>
          </p>
          <p className="text-muted">
            For the full legal terms, see our{' '}
            <Link href="/terms" className="underline hover:text-text">
              Terms of Service
            </Link>
            .
          </p>
        </div>
    </LegalPageShell>
  );
}
