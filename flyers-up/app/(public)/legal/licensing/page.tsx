import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Licensing and Regulatory Compliance Policy — Flyers Up',
};

export default function LicensingPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Licensing and Regulatory Compliance Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Licensing and Regulatory Compliance Policy explains the respective responsibilities of Flyers Up and
          service professionals (&quot;Pros&quot;) regarding licenses, certifications, permits, and regulatory compliance.
          This policy is incorporated by reference into our Terms of Service and Independent Contractor Agreement.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Pro Responsibility for Licenses</h2>
        <p>
          Pros are solely responsible for obtaining and maintaining all licenses, permits, certifications, and
          authorizations required to perform the services they offer. Licensing requirements vary by jurisdiction,
          service type, and profession. Examples include: contractor licenses; trade certifications; business permits;
          professional licenses; and other regulatory requirements.
        </p>
        <p>
          Pros represent and warrant that they hold all required credentials and that such credentials are current,
          valid, and in good standing. Pros are responsible for renewing licenses and certifications as required by law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Pro Responsibility for Local Laws</h2>
        <p>
          Pros are solely responsible for complying with all applicable local, state, and federal laws, including
          occupational licensing laws, zoning regulations, tax obligations, and business registration requirements.
          Pros must conduct their operations in accordance with the laws of the jurisdictions in which they provide
          services.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Pro Responsibility for Permits</h2>
        <p>
          Pros are responsible for obtaining any permits required for their work, including building permits, health
          permits, or other regulatory approvals. Flyers Up does not obtain permits on behalf of Pros and is not
          responsible for Pro compliance with permit requirements.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Insurance Requirements</h2>
        <p>
          Pros are encouraged to maintain appropriate liability insurance and other business insurance. Certain service
          categories or jurisdictions may have insurance requirements. Pros are responsible for meeting any applicable
          insurance requirements. See our <Link href="/legal/insurance" className="underline hover:text-text">Insurance Recommendation Policy</Link> for
          additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Flyers Up Does Not Verify Every License</h2>
        <p>
          Flyers Up may offer verification features, credential uploads, or third-party screening for some Pros. Such
          verification is not comprehensive and does not cover all licenses, certifications, or regulatory
          requirements. Flyers Up does not independently verify the authenticity, accuracy, or current status of every
          credential. Verification, badges, or trust indicators do not guarantee that a Pro holds all required licenses
          or complies with all applicable laws.
        </p>
        <p>
          Customers are encouraged to conduct their own due diligence when selecting a Pro. Flyers Up is not responsible
          for any Pro&apos;s failure to obtain or maintain required licenses, permits, or certifications.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Consequences of Non-Compliance</h2>
        <p>
          Pros who fail to obtain or maintain required licenses, or who violate applicable laws, may be suspended or
          removed from the Platform. Flyers Up may cooperate with regulatory authorities and law enforcement regarding
          suspected violations. Pros are solely liable for any penalties, fines, or legal consequences arising from
          non-compliance.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Platform Role</h2>
        <p>
          Flyers Up is a technology platform that connects customers with independent service providers. Flyers Up does
          not employ Pros, supervise their work, or guarantee their qualifications. Flyers Up is not responsible for
          the regulatory compliance of Pros. See our <Link href="/legal/terms" className="underline hover:text-text">Terms of Service</Link> for
          the platform role disclaimer.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Contact</h2>
        <p>Flyers Up LLC — support@flyersup.app</p>
      </div>
    </LegalPageShell>
  );
}
