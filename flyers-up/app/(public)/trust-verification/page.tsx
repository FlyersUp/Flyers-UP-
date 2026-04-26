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
        We use clear trust signals so customers can make informed decisions. Here is what each signal means, and what it does not mean.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-surface2">
            <tr>
              <th className="px-4 py-3 font-semibold text-text">Signal</th>
              <th className="px-4 py-3 font-semibold text-text">What it means</th>
              <th className="px-4 py-3 font-semibold text-text">What it doesn&apos;t mean</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium text-text">ID Verified</td>
              <td className="px-4 py-3 text-muted">Government ID checked</td>
              <td className="px-4 py-3 text-muted">Not a full background check</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium text-text">Jobs Completed</td>
              <td className="px-4 py-3 text-muted">Work completed through Flyers Up</td>
              <td className="px-4 py-3 text-muted">Not proof of licensing or expertise</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium text-text">Response Time</td>
              <td className="px-4 py-3 text-muted">Average reply speed from prior messages</td>
              <td className="px-4 py-3 text-muted">Not a guarantee of availability</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 font-medium text-text">Reviews</td>
              <td className="px-4 py-3 text-muted">Real customer feedback from completed jobs</td>
              <td className="px-4 py-3 text-muted">Not every job is reviewed</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 surface-card p-5">
        <h2 className="text-base font-semibold tracking-tight text-text">What we don&apos;t claim yet</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>We do not currently claim every pro has passed a full background check.</li>
          <li>We do not guarantee quality, safety, legality, or outcomes.</li>
          <li>We are building trust through ID checks, completed jobs, response speed, and real customer reviews.</li>
          <li>More verification layers can be added over time.</li>
        </ul>
      </div>

      <div className="mt-4 text-xs text-muted/70">
        For the binding terms, see{' '}
        <Link href="/terms" className="underline hover:text-text">
          Terms of Service
        </Link>
        .
      </div>
    </LegalPageShell>
  );
}

