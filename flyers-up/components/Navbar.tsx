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
    <nav className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-900">{title}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            href="/signin"
            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}






