import Link from 'next/link';
import { Send } from 'lucide-react';

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-market-line/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-market-slate transition-opacity hover:opacity-90"
            aria-label="Flyers Up home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-market-slate/10 text-market-slate">
              <Send className="h-5 w-5 -rotate-45" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight text-market-slate md:text-xl">Flyers Up</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/signin"
              className="text-sm font-semibold text-market-slate transition-colors hover:text-market-slate/80"
            >
              Log in
            </Link>
            <Link
              href="/signup?role=customer"
              className="rounded-xl bg-market-slate px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-market-slate/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-slate focus-visible:ring-offset-2"
            >
              Join Free
            </Link>
          </div>
        </div>
        <nav
          className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-market-line/60 pt-3 text-sm font-semibold text-market-charcoal md:mt-0 md:border-0 md:pt-0"
          aria-label="Marketing links"
        >
          <Link href="#for-customers" className="transition-colors hover:text-market-slate">
            For Customers
          </Link>
          <Link href="#for-pros" className="transition-colors hover:text-market-slate">
            For Pros
          </Link>
          <Link href="/trust-verification" className="transition-colors hover:text-market-slate">
            Safety
          </Link>
        </nav>
      </div>
    </header>
  );
}
