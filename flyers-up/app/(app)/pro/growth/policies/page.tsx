'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GrowthPageShell } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';

const LINKS: { label: string; href: string; description: string }[] = [
  {
    label: 'Legal, terms & privacy',
    href: '/pro/settings/support-legal',
    description: 'Terms of use, privacy policy, and marketplace rules.',
  },
  {
    label: 'Booking rules',
    href: '/booking-rules',
    description: 'Deposits, cancellations, and how bookings are protected.',
  },
  {
    label: 'Safety & compliance',
    href: '/pro/settings/safety-compliance',
    description: 'Insurance, guidelines, and compliance items on file.',
  },
  {
    label: 'Help & support',
    href: '/pro/settings/help-support',
    description: 'Get help from the team when something needs a human.',
  },
];

export default function ProGrowthPoliciesPage() {
  return (
    <GrowthPageShell title="Platform policies">
      <p className="text-sm text-text2 mb-6 leading-relaxed">
        Official policies and references for operating as a service pro on the platform.
      </p>
      <ul className="space-y-3">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block">
              <Card
                padding="md"
                className="hover:bg-hover/50 transition flex items-center justify-between gap-3 group"
              >
                <div>
                  <h2 className="text-base font-semibold text-text">{item.label}</h2>
                  <p className="mt-1 text-sm text-text2">{item.description}</p>
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
