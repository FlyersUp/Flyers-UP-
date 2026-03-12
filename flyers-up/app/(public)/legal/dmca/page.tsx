import { LegalPageShell } from '@/components/LegalPageShell';

const VERSION = '2026-03-11';

export const metadata = {
  title: 'DMCA Copyright Policy — Flyers Up',
};

export default function DMCAPage() {
  return (
    <LegalPageShell>
      <div className="text-xs text-muted mb-4">Policy v{VERSION}</div>
      <h1 className="text-2xl font-semibold tracking-tight">Flyers Up LLC — DMCA Copyright Policy</h1>
      <div className="mt-2 text-sm text-muted">
        <div><span className="font-medium text-text">Effective Date:</span> March 11, 2026</div>
        <div><span className="font-medium text-text">Last Updated:</span> March 11, 2026</div>
      </div>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <p>
          Flyers Up LLC (&quot;Flyers Up&quot;) respects the intellectual property rights of others and expects users of the
          Platform to do the same. This DMCA Copyright Policy describes our procedures for addressing claims of
          copyright infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512).
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 1 — Filing a Copyright Complaint (Takedown Notice)</h2>
        <p>
          If you believe that content on the Flyers Up platform infringes your copyright, you may submit a DMCA
          takedown notice to our designated agent. Your notice must include the following information:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <span className="font-medium">Identification of the copyrighted work</span> you claim has been infringed, or,
            if multiple works are covered, a representative list.
          </li>
          <li>
            <span className="font-medium">Identification of the infringing material</span> and information reasonably
            sufficient to permit us to locate the material (e.g., URL, screenshot, or description).
          </li>
          <li>
            <span className="font-medium">Your contact information</span>, including your name, address, telephone
            number, and email address.
          </li>
          <li>
            <span className="font-medium">A statement</span> that you have a good faith belief that use of the material
            in the manner complained of is not authorized by the copyright owner, its agent, or the law.
          </li>
          <li>
            <span className="font-medium">A statement</span> that the information in the notice is accurate, and, under
            penalty of perjury, that you are authorized to act on behalf of the copyright owner.
          </li>
          <li>
            <span className="font-medium">Your physical or electronic signature.</span>
          </li>
        </ol>
        <p>
          Send takedown notices to: <span className="font-medium">hello.flyersup@gmail.com</span> with the subject line
          &quot;DMCA Takedown Notice.&quot;
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 2 — Counter Notice</h2>
        <p>
          If you believe that your content was removed or disabled as a result of mistake or misidentification, you
          may submit a counter notice to our designated agent. Your counter notice must include:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Identification of the material that was removed or disabled and the location at which it appeared before removal.</li>
          <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
          <li>Your name, address, telephone number, and email address.</li>
          <li>A statement that you consent to the jurisdiction of the federal court in the district in which your address is located (or New York, NY if outside the United States), and that you will accept service of process from the person who provided the original takedown notice.</li>
          <li>Your physical or electronic signature.</li>
        </ol>
        <p>
          Send counter notices to: <span className="font-medium">hello.flyersup@gmail.com</span> with the subject line
          &quot;DMCA Counter Notice.&quot;
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 3 — Our Response</h2>
        <p>
          We will respond to valid takedown notices in accordance with the DMCA. We may remove or disable access to
          allegedly infringing content and may terminate the accounts of repeat infringers. We will forward counter
          notices to the original complainant. If the complainant does not file a court action within 10 business days,
          we may restore the removed content.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 4 — Repeat Infringer Policy</h2>
        <p>
          In appropriate circumstances, Flyers Up will terminate the accounts of users who are repeat infringers. We
          maintain a policy that provides for the termination of user accounts in appropriate circumstances.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 5 — Misrepresentation</h2>
        <p>
          Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material or activity is
          infringing, or that material or activity was removed or disabled by mistake or misidentification, may be
          subject to liability. We may seek damages from any person who submits a false or frivolous notice.
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 6 — Designated Agent</h2>
        <p>
          Flyers Up LLC&apos;s designated agent for receipt of DMCA notices is:
        </p>
        <p className="font-medium">
          Flyers Up LLC<br />
          Email: hello.flyersup@gmail.com<br />
          Subject: DMCA Takedown Notice / DMCA Counter Notice
        </p>

        <h2 className="text-lg font-semibold tracking-tight pt-4">Section 7 — Contact</h2>
        <p>Flyers Up LLC — hello.flyersup@gmail.com</p>
      </div>
    </LegalPageShell>
  );
}
