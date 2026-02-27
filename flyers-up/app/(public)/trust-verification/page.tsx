import Link from 'next/link';
import { LegalPageShell } from '@/components/LegalPageShell';

export const metadata = {
  title: 'Trust & Verification — Flyers Up',
};

export default function TrustVerificationPage() {
  return (
    <LegalPageShell>
        <h1 className="text-2xl font-semibold tracking-tight">Trust &amp; Verification</h1>
        <p className="mt-2 text-sm text-muted">
          Plain-English overview of how Flyers Up trust indicators work. This page mirrors Section 7 of the Terms of Service.
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">What “Verified” means</div>
            <div className="mt-2 text-muted">
              Verification may include document review and/or third-party checks. Verification helps reduce risk, but it is not a guarantee of performance, safety, legality, or
              quality. Users are responsible for their own due diligence.
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">Credentials &amp; uploads</div>
            <div className="mt-2 text-muted">
              Pros may upload licenses, certifications, or other credentials. Flyers Up may display these as trust indicators. Flyers Up does not independently guarantee authenticity
              unless explicitly stated.
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="text-sm font-semibold tracking-tight">Coverage / insurance</div>
            <div className="mt-2 text-muted">
              Any coverage or insurance feature may not be available in all locations, may be provided by third parties, and is governed by separate terms.
            </div>
          </div>

          <div className="text-xs text-muted/70">
            For the binding terms, see{' '}
            <Link href="/terms" className="underline hover:text-text">
              Terms of Service
            </Link>
            .
          </div>
        </div>
    </LegalPageShell>
  );
}

