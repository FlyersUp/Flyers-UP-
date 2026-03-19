import { LegalPageShell } from '@/components/LegalPageShell';
import Link from 'next/link';

const VERSION = '2026-03-17';

export const metadata = {
  title: 'Background Check Consent Policy — Flyers Up',
};

export default function BackgroundCheckConsentPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — Background Check Consent Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 17, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 17, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Introduction</h2>
        <p>
          Flyers Up LLC (&quot;Flyers Up,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) may offer identity verification and
          background screening services to promote trust and safety on the Flyers Up platform (the &quot;Platform&quot;). This
          Background Check Consent Policy (&quot;Policy&quot;) describes the screening process and your rights when you choose
          to participate. By agreeing to undergo screening, you acknowledge that you have read, understood, and agree to
          this Policy. This Policy is incorporated by reference into our <Link href="/legal/terms" className="underline hover:text-text">Terms of Service</Link> and{' '}
          <Link href="/legal/pro-agreement" className="underline hover:text-text">Independent Contractor Agreement</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Voluntary Nature of Screening</h2>
        <p>
          Participation in identity verification and background screening is voluntary. However, Flyers Up may require
          completion of screening for certain trust badges, service categories, or platform features. If screening is
          required for a feature you wish to use, your decision to use that feature constitutes your agreement to
          undergo the applicable screening. Flyers Up reserves the right to require screening for additional service
          categories or features at any time.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Consent to Screening</h2>
        <p>
          By agreeing to this Policy and proceeding with screening, you expressly authorize Flyers Up and its designated
          third-party screening providers to conduct one or more of the following checks, as applicable:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Criminal history checks:</span> Searches of criminal records, including federal, state, county, and municipal databases, and sex offender registries where permitted by law.</li>
          <li><span className="font-medium">Identity verification:</span> Verification of your identity using government-issued identification and other documents or methods.</li>
          <li><span className="font-medium">Watchlist or sanctions screening:</span> Searches against government watchlists, sanctions lists, and similar databases.</li>
          <li><span className="font-medium">Address history verification:</span> Verification of your residential address history.</li>
          <li><span className="font-medium">Professional credential verification:</span> Where applicable to your service category, verification of licenses, certifications, or other professional credentials.</li>
        </ul>
        <p>
          You represent that all information you provide in connection with screening is accurate and complete. Providing
          false or misleading information may result in denial of access to the Platform, removal of trust indicators,
          and termination of your account.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Third-Party Screening Providers</h2>
        <p>
          Flyers Up does not directly perform background checks. We engage independent, qualified third-party screening
          providers to conduct screenings on our behalf. These providers are selected based on their compliance with
          applicable laws and industry standards. Flyers Up does not guarantee the accuracy, completeness, or timeliness
          of information provided by third-party screening providers. You may receive separate disclosures and
          authorizations from the screening provider as required by law.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Scope and Limitations</h2>
        <p>
          Background checks and identity verification have inherent limitations. Screening may not capture all records,
          including records in jurisdictions not searched, sealed or expunged records where disclosure is restricted,
          or records that have not yet been reported to databases. A favorable screening result does not guarantee
          future behavior, safety, or suitability. Flyers Up does not warrant that screening will identify all relevant
          information. Screening is one factor among many in our trust and safety program.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Consumer Rights</h2>
        <p>
          Where applicable, you may have rights under the Fair Credit Reporting Act (FCRA) and similar laws. These may
          include the right to receive a copy of your consumer report, the right to dispute inaccurate information with
          the consumer reporting agency, and the right to know if information in a consumer report was used in an
          adverse decision. If you believe that screening has resulted in an adverse decision, you may contact us and
          we will provide information regarding your rights and the screening provider&apos;s contact information, as
          required by law. For California residents, additional rights may apply under the California Investigative
          Consumer Reporting Agencies Act (ICRAA).
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Data Handling</h2>
        <p>
          Background check and identity verification information is collected, stored, and processed in accordance with
          our <Link href="/legal/privacy" className="underline hover:text-text">Privacy Policy</Link> and{' '}
          <Link href="/legal/security" className="underline hover:text-text">Data Security Policy</Link>. Such information
          is used solely for trust and safety purposes, including verifying your identity, assessing platform eligibility,
          displaying trust indicators, and protecting users. Access to screening results is restricted to authorized
          personnel and systems on a need-to-know basis. We retain screening-related data only as long as necessary for
          legal, operational, and safety purposes.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 8 — Platform Safety Signals</h2>
        <p>
          Screening results may influence trust indicators displayed on the Platform, including but not limited to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Verified identity:</span> An indicator that your identity has been verified.</li>
          <li><span className="font-medium">Background check badge:</span> An indicator that you have completed a background check with favorable results.</li>
          <li><span className="font-medium">Platform trust levels:</span> Internal trust scores or tiers that may affect visibility, eligibility for features, or platform access.</li>
        </ul>
        <p>
          Trust indicators do not constitute a guarantee, endorsement, or certification of your character, qualifications,
          or suitability. Customers are responsible for their own due diligence. See our{' '}
          <Link href="/trust-verification" className="underline hover:text-text">Trust &amp; Verification</Link> page for
          additional detail.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 9 — No Employment Relationship</h2>
        <p>
          Pros who use the Flyers Up platform are independent contractors, not employees of Flyers Up. Participation in
          background screening does not create an employment relationship. Screening is conducted solely for platform
          trust and safety purposes. This Policy does not alter the terms of our{' '}
          <Link href="/legal/pro-agreement" className="underline hover:text-text">Independent Contractor Agreement</Link>.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 10 — Updates to Policy</h2>
        <p>
          Flyers Up may update this Policy from time to time. We will notify you of material changes by posting the
          updated Policy and updating the &quot;Last Updated&quot; date. If you have already consented to screening, material
          changes may require renewed consent before additional screening is conducted. Continued participation in
          screening after changes indicates acceptance of the updated Policy.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 11 — Contact</h2>
        <p>
          Questions regarding this Policy or screening may be directed to: Flyers Up LLC — hello.flyersup@gmail.com
        </p>
      </div>
    </LegalPageShell>
  );
}
