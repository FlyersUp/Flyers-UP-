'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GrowthPageShell } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';

const MODULES: { title: string; body: string; href: string }[] = [
  {
    title: 'Booking rules & deposits',
    body: 'How holds, deposits, and cancellations work so you can set expectations with customers.',
    href: '/booking-rules',
  },
  {
    title: 'Pricing & availability',
    body: 'Keep rates and windows accurate to reduce disputes and improve acceptance.',
    href: '/pro/settings/pricing-availability',
  },
  {
    title: 'Reviews & reputation',
    body: 'Deliver great service, confirm completions on time, and invite happy customers to leave feedback.',
    href: '/pro/profile',
  },
  {
    title: 'Disputes & chargebacks',
    body: 'Documentation, in-app messaging, and platform policies that protect both sides.',
    href: '/pro/settings/support-legal',
  },
  {
    title: 'Help center',
    body: "Browse FAQs and contact support when something doesn't look right.",
    href: '/pro/settings/help-support',
  },
];

export default function ProGrowthEducationPage() {
  return (
    <GrowthPageShell title="Education & best practices">
      <p className="text-sm text-text2 mb-6 leading-relaxed">
        Short modules to help you price fairly, earn strong reviews, and avoid preventable disputes.
      </p>
      <ul className="space-y-3">
        {MODULES.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="block">
              <Card
                padding="md"
                className="hover:bg-hover/50 transition flex items-center justify-between gap-3 group"
              >
                <div>
                  <h2 className="text-base font-semibold text-text group-hover:underline-offset-2">{m.title}</h2>
                  <p className="mt-1 text-sm text-text2 leading-snug">{m.body}</p>
                </div>
                <ChevronRight size={22} className="flex-shrink-0 text-text3" aria-hidden />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </GrowthPageShell>
  );
}
