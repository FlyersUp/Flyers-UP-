'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

interface LegalItem {
  label: string;
  href: string;
}

const ITEMS: LegalItem[] = [
  { label: 'Terms of service', href: '/legal/terms' },
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Community guidelines', href: '/legal/guidelines' },
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
