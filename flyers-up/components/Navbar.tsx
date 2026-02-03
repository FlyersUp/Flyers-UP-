'use client';

/**
 * Navbar component
 * NOTE: No mock users/tokens. Presentational header only.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Navbar({ title = 'Flyers Up', showBackButton = false }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="bg-[var(--surface-solid)] border-b border-[var(--surface-border)] px-[var(--page-pad-x)] py-3 shadow-card">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="text-muted hover:text-text transition-colors"
              aria-label="Go back"
            >
              ← Back
            </button>
          )}

          {title === 'Flyers Up' ? (
            <Logo size="sm" />
          ) : (
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-muted/60">|</span>
              <span className="font-semibold text-text">{title}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-text font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            href="/signin"
            className="text-sm bg-accent hover:bg-accent text-accentContrast px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}






