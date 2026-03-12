'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LegalPageShellProps {
  children: React.ReactNode;
  /** Optional back href; when omitted, uses router.back() to return to previous page */
  backHref?: string;
}

export function LegalPageShell({ children, backHref }: LegalPageShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex flex-col">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-solid)] shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {backHref ? (
            <Link
              href={backHref}
              className="text-sm font-medium text-muted hover:text-text transition-colors flex items-center gap-1"
            >
              ← Back
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm font-medium text-muted hover:text-text transition-colors flex items-center gap-1"
            >
              ← Back
            </button>
          )}
          <Link href="/" className="text-sm font-semibold tracking-tight text-text hover:opacity-90">
            Flyers Up
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {children}
      </main>

      <footer className="border-t border-[var(--surface-border)] bg-[var(--surface-solid)] py-6 mt-auto shrink-0">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted">
            <Link href="/" className="hover:text-text transition-colors">Home</Link>
            <Link href="/legal/terms" className="hover:text-text transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-text transition-colors">Privacy</Link>
            <Link href="/legal/pro-agreement" className="hover:text-text transition-colors">Pro Agreement</Link>
            <Link href="/legal/payments" className="hover:text-text transition-colors">Payments</Link>
            <Link href="/legal/guidelines" className="hover:text-text transition-colors">Guidelines</Link>
            <Link href="/legal/licensing" className="hover:text-text transition-colors">Licensing</Link>
            <Link href="/legal/arbitration" className="hover:text-text transition-colors">Arbitration</Link>
            <Link href="/legal/refunds" className="hover:text-text transition-colors">Refunds</Link>
            <Link href="/legal/dmca" className="hover:text-text transition-colors">DMCA</Link>
            <Link href="/legal/acceptable-use" className="hover:text-text transition-colors">Acceptable Use</Link>
            <Link href="/legal/security" className="hover:text-text transition-colors">Security</Link>
            <Link href="/legal/insurance" className="hover:text-text transition-colors">Insurance</Link>
            <Link href="/trust-verification" className="hover:text-text transition-colors">Trust & Verification</Link>
          </nav>
          <p className="mt-4 text-center text-xs text-muted/70" suppressHydrationWarning>
            © {new Date().getFullYear()} Flyers Up LLC
          </p>
        </div>
      </footer>
    </div>
  );
}
