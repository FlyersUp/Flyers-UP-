'use client';

import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';

type Props = {
  protocolsHref?: string;
};

export function SecurityTrustCard({ protocolsHref = '/customer/settings/support-legal' }: Props) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[hsl(var(--accent-customer)/0.18)] bg-gradient-to-b from-[hsl(var(--accent-customer)/0.08)] to-[hsl(var(--trust)/0.06)] p-5 shadow-sm ring-1 ring-black/[0.03] dark:from-white/[0.06] dark:to-white/[0.03] dark:border-white/10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[hsl(var(--accent-customer))] shadow-sm dark:bg-white/10 dark:text-white">
          <ShieldCheck className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-base font-bold text-text">Security is our priority.</h2>
          <p className="text-sm leading-relaxed text-text2">
            Your payment details are encrypted in transit and handled by Stripe—never stored as full card numbers on
            Flyers Up servers. We use the same infrastructure trusted by millions of businesses.
          </p>
          <Link
            href={protocolsHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--accent-customer))] hover:underline"
          >
            View privacy &amp; terms
            <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
          </Link>
        </div>
      </div>
      <div
        className="mt-4 h-24 w-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 opacity-95 ring-1 ring-white/10"
        role="img"
        aria-label=""
      />
    </section>
  );
}
