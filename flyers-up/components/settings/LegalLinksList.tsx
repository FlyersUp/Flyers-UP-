'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

interface LegalItem {
  label: string;
  href: string;
}

const ITEMS: LegalItem[] = [
  { label: 'Support & contact', href: '/support' },
  { label: 'Terms of service', href: '/legal/terms' },
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Pro agreement', href: '/legal/pro-agreement' },
  { label: 'Payments', href: '/legal/payments' },
  { label: 'Community guidelines', href: '/legal/guidelines' },
  { label: 'Licensing', href: '/legal/licensing' },
  { label: 'Arbitration', href: '/legal/arbitration' },
  { label: 'Refunds', href: '/legal/refunds' },
  { label: 'DMCA', href: '/legal/dmca' },
  { label: 'Acceptable use', href: '/legal/acceptable-use' },
  { label: 'Security', href: '/legal/security' },
  { label: 'Insurance', href: '/legal/insurance' },
  { label: 'Background check consent', href: '/legal/background-check-consent' },
  { label: 'Data processing agreement', href: '/legal/data-processing-agreement' },
];

export function LegalLinksList() {
  return (
    <div className="space-y-1">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 p-3 rounded-xl border border-black/5 hover:bg-black/[0.02] hover:border-black/10 transition-colors"
        >
          <FileText size={18} className="text-muted shrink-0" />
          <span className="text-sm font-medium text-text">{item.label}</span>
          <span className="ml-auto text-muted text-xs">→</span>
        </Link>
      ))}
    </div>
  );
}
