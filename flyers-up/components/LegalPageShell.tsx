import Link from 'next/link';

interface LegalPageShellProps {
  children: React.ReactNode;
  /** Optional back href; defaults to "/" */
  backHref?: string;
}

export function LegalPageShell({ children, backHref = '/' }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex flex-col">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-solid)] shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="text-sm font-medium text-muted hover:text-text transition-colors flex items-center gap-1"
          >
            ← Back
          </Link>
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
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <Link href="/" className="hover:text-text transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-text transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text transition-colors">
              Privacy
            </Link>
            <Link href="/community-guidelines" className="hover:text-text transition-colors">
              Community Guidelines
            </Link>
            <Link href="/refund-policy" className="hover:text-text transition-colors">
              Refund Policy
            </Link>
            <Link href="/trust-verification" className="hover:text-text transition-colors">
              Trust & Verification
            </Link>
          </nav>
          <p className="mt-4 text-center text-xs text-muted/70">
            © {new Date().getFullYear()} Flyers Up LLC
          </p>
        </div>
      </footer>
    </div>
  );
}
