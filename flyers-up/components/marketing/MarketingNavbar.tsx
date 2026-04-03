import Link from 'next/link';
import { MarketingButton } from '@/components/marketing/ui/Button';
import { Shield } from 'lucide-react';

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-market-slate shadow-sm">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-6 md:py-4">
        <Link
          href="/"
          className="col-start-1 row-start-1 flex items-center gap-2.5 text-white transition-opacity hover:opacity-95"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <Shield className="h-5 w-5 text-market-orange" strokeWidth={2} aria-hidden />
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
        <nav className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-3 text-sm font-medium text-white/90 md:col-span-1 md:col-start-2 md:row-start-1 md:border-0 md:pt-0">
          <Link href="#for-customers" className="transition-colors hover:text-white">
            For Customers
          </Link>
          <Link href="#for-pros" className="transition-colors hover:text-white">
            For Pros
          </Link>
          <Link href="/trust-verification" className="transition-colors hover:text-white">
            Safety
          </Link>
        </nav>
      </div>
    </header>
  );
}
