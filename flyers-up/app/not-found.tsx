/**
 * NOT-FOUND PAGE
 * Handles invalid/missing routes only (404).
 * Rendered when a route segment calls notFound() or when no matching route exists.
 * Does NOT handle runtime errors — use error.tsx for those.
 */

import Link from 'next/link';
import { Home } from 'lucide-react';
import { ReportIssueButton } from '@/components/error';
import { GoBackButton } from '@/components/error/GoBackButton';
import { ErrorPageCard } from '@/components/error/ErrorPageCard';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <ErrorPageCard
        headline="Page not found"
        body="We couldn't find this page. If you got here from inside Flyers Up, please let us know."
      >
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold bg-accent text-accentContrast hover:opacity-95 transition-opacity"
        >
          <Home size={18} strokeWidth={2} />
          Go Home
        </Link>
        <GoBackButton />
        <ReportIssueButton variant="secondary" />
      </ErrorPageCard>
    </div>
  );
}
