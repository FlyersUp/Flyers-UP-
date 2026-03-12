import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'Insurance Recommendation Policy for Service Providers — Flyers Up',
};

export default function InsurancePage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Insurance Recommendation Policy for Service Providers</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          This Insurance Recommendation Policy explains Flyers Up LLC&apos;s (&quot;Flyers Up&quot;) position regarding
          insurance for service professionals (&quot;Pros&quot;) who use the Platform. This policy is incorporated by reference
          into our Independent Contractor Agreement and Terms of Service.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Flyers Up Does Not Provide Insurance</h2>
        <p>
          Unless otherwise expressly stated in a separate agreement, Flyers Up does not provide insurance coverage for
          Pros or for services performed through the Platform. Pros are independent contractors who operate their own
          businesses. Any insurance that may be offered or displayed on the Platform in the future would be subject to
          separate terms and would be provided by third-party insurers, not Flyers Up.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Recommendation: General Liability Insurance</h2>
        <p>
          Flyers Up strongly encourages Pros to obtain and maintain general liability insurance. General liability
          insurance typically covers claims for bodily injury, property damage, and personal injury arising from your
          business operations. The appropriate coverage limits depend on the type of services you offer and your risk
          profile. Pros should consult with an insurance professional to determine appropriate coverage.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Recommendation: Business Insurance</h2>
        <p>
          Pros are encouraged to maintain appropriate business insurance, which may include professional liability
          (errors and omissions) insurance for certain service types, commercial auto insurance if you use a vehicle
          for business purposes, and other coverage relevant to your operations.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Workers&apos; Compensation</h2>
        <p>
          If you employ or engage workers to assist with services, you may be required by law to maintain workers&apos;
          compensation insurance. Workers&apos; compensation requirements vary by state and by the number of employees or
          subcontractors. Pros are solely responsible for complying with workers&apos; compensation laws applicable to
          their business.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Jurisdictional Requirements</h2>
        <p>
          Certain jurisdictions or service categories may require Pros to maintain specific types or minimum levels of
          insurance. Pros are solely responsible for determining and meeting any applicable insurance requirements.
          Flyers Up does not verify that Pros maintain adequate insurance unless we expressly require it for specific
          programs or service categories.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — No Verification</h2>
        <p>
          Flyers Up may offer features that allow Pros to upload or display insurance information. Such features do not
          constitute verification of coverage, adequacy, or validity. Flyers Up does not independently verify insurance
          policies. Customers are encouraged to conduct their own due diligence when selecting a Pro.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Pro Liability</h2>
        <p>
          Pros are solely responsible for any claims, damages, or losses arising from their provision of services.
          Flyers Up is not liable for such claims. Pros agree to indemnify Flyers Up as set forth in our{' '}
          <Link href="/legal/pro-agreement" className="underline hover:text-text">Independent Contractor Agreement</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Future Programs</h2>
        <p>
          Flyers Up may in the future offer or partner with third parties to offer insurance products or programs for
          Pros. Any such offerings would be subject to separate terms and would be provided by licensed insurers.
          This policy does not create any obligation for Flyers Up to offer such programs.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — Contact</h2>
        <p>
          Questions about this policy: Flyers Up LLC — hello.flyersup@gmail.com
        </p>
        <p className="text-muted">
          For insurance coverage, consult a licensed insurance professional. Flyers Up does not provide insurance advice.
        </p>
      </div>
    </LegalPageShell>
  );
}
