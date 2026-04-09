'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ChevronLeft, CreditCard, History, FileText, RotateCcw } from 'lucide-react';

const LINKS = [
  {
    href: '/customer/settings/payments/methods',
    title: 'Payment methods',
    desc: 'Cards, defaults, and backup billing.',
    icon: CreditCard,
  },
  {
    href: '/customer/settings/payments/history',
    title: 'Payment history',
    desc: 'Deposits, final payments, and status.',
    icon: History,
  },
  {
    href: '/customer/settings/payments/receipts',
    title: 'Receipts',
    desc: 'Proof of payment by booking.',
    icon: FileText,
  },
  {
    href: '/customer/settings/payments/refunds',
    title: 'Refunds',
    desc: 'Track refunds tied to your jobs.',
    icon: RotateCcw,
  },
] as const;

export default function CustomerPaymentsHubPage() {
  return (
    <AppLayout mode="customer">
      <div className="mx-auto w-full min-w-0 max-w-2xl px-4 py-5 pb-12 sm:px-5 sm:py-6 sm:pb-10">
        <Link
          href="/customer/settings"
          className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent-customer))] hover:opacity-90"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Settings
        </Link>
        <header className="mt-4 space-y-2">
          <span className="inline-block rounded-full bg-[hsl(var(--accent-customer)/0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent-customer))] ring-1 ring-[hsl(var(--accent-customer)/0.2)]">
            Financial hub
          </span>
          <h1 className="text-2xl font-bold text-text sm:text-[1.65rem]">Payments</h1>
          <p className="text-[15px] text-text2">
            Everything about how you pay on Flyers Up—methods, activity, receipts, and refunds.
          </p>
        </header>

        <ul className="mt-8 space-y-3">
          {LINKS.map(({ href, title, desc, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[hsl(var(--accent-customer)/0.35)] active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent-customer)/0.1)] text-[hsl(var(--accent-customer))]">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text">{title}</p>
                  <p className="text-sm text-text2">{desc}</p>
                </div>
                <span className="shrink-0 text-text3" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
