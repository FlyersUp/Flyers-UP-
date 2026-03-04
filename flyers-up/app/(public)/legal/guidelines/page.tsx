import { LegalPageShell } from '@/components/LegalPageShell';

const GUIDELINES_VERSION = '2026-01-27';

export const metadata = {
  title: 'Community Guidelines — Flyers Up',
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Guidelines v{GUIDELINES_VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up — Community Guidelines</h1>
      <div className="mt-2 text-sm text-muted">
        <div>
          <span className="font-medium text-text">Last Updated:</span> January 27, 2026
        </div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          These Community Guidelines outline the professional standards expected of service pros and customers on the Flyers Up platform.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-2">Professional conduct</h2>
        <p>
          Service pros agree to provide services in a professional, safe, and respectful manner. Customers agree to communicate clearly and treat pros with respect.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-2">Safety</h2>
        <p>
          Both parties must ensure a safe environment. Pros should not perform work beyond their expertise. Customers should provide accurate information about the job and environment.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-2">Honesty</h2>
        <p>
          Accurate listings, honest reviews, and truthful communication are required. Misrepresentation may result in account suspension.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-2">Contact</h2>
        <p>
          Questions about these guidelines: <span className="font-medium">support@flyersup.app</span>
        </p>
      </div>
    </LegalPageShell>
  );
}
