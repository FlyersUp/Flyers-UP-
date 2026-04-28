import Link from 'next/link';
import { MarketingButton } from '@/components/marketing/ui/Button';

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-market-slate shadow-sm">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-6 md:py-4">
        <Link
          href="/"
          className="col-start-1 row-start-1 flex items-center gap-2.5 text-white transition-opacity hover:opacity-95"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M21.2 8.4C21.6 8.2 22 8.3 22.2 8.6C22.4 9 22.2 9.4 21.8 9.6L15 13L15.8 18.3C15.9 18.7 15.7 19 15.4 19.2C15.1 19.3 14.7 19.2 14.4 19L11.2 15.8L7.6 17.6L8.2 20.1C8.3 20.4 8.1 20.7 7.8 20.9C7.5 21 7.1 21 6.9 20.7L5.4 18.8L3.1 18.9C2.7 18.9 2.4 18.7 2.3 18.4C2.2 18.1 2.3 17.7 2.6 17.5L4.7 16.2L3.8 13.8C3.7 13.5 3.8 13.2 4.1 13C4.4 12.8 4.7 12.8 5 13L7 14.4L10.6 12.6L8.7 8.4C8.6 8.1 8.6 7.7 8.9 7.4C9.1 7.2 9.5 7.1 9.8 7.3L14.4 10L21.2 8.4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight md:text-xl">FLYERS UP</span>
        </Link>
        <div className="col-start-2 row-start-1 justify-self-end md:col-start-3 md:row-start-1">
          <MarketingButton
            href="/signin"
            variant="primary"
            className="!px-4 !py-2.5 text-sm !ring-offset-market-slate"
          >
            Sign In
          </MarketingButton>
        </div>
        <nav className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-3 text-sm font-semibold text-white md:col-span-1 md:col-start-2 md:row-start-1 md:border-0 md:pt-0">
          <Link href="#for-customers" className="transition-colors hover:text-white/95">
            For Customers
          </Link>
          <Link href="#for-pros" className="transition-colors hover:text-white/95">
            For Pros
          </Link>
          <Link href="/trust-verification" className="transition-colors hover:text-white/95">
            Safety
          </Link>
        </nav>
      </div>
    </header>
  );
}
