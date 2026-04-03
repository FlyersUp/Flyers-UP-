import Link from 'next/link';
import { Shield } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="border-t border-market-line bg-market-cloud py-14 text-market-charcoal/70">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-market-slate">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-market-slate/10">
                <Shield className="h-5 w-5 text-market-orange" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-base font-bold tracking-tight">Flyers Up</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Trusted local infrastructure for hiring pros—with warmth and clarity.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-market-charcoal">For customers</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#how-it-works" className="hover:text-market-slate">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="#browse-occupations" className="hover:text-market-slate">
                  Browse services
                </Link>
              </li>
              <li>
                <Link href="/trust-verification" className="hover:text-market-slate">
                  Safety
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-market-charcoal">For pros</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/signup?role=pro" className="hover:text-market-slate">
                  Join as a pro
                </Link>
              </li>
              <li>
                <Link href="/signin?role=pro" className="hover:text-market-slate">
                  Pro sign in
                </Link>
              </li>
              <li>
                <Link href="/legal/independent-contractor" className="hover:text-market-slate">
                  Pro resources
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-market-charcoal">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/community-guidelines" className="hover:text-market-slate">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/signin" className="hover:text-market-slate">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-market-slate">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-market-line pt-8 sm:flex-row">
          <p className="text-sm">© {new Date().getFullYear()} Flyers Up. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-market-slate">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-market-slate">
              Terms
            </Link>
            <Link href="/privacy#cookies" className="hover:text-market-slate">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
