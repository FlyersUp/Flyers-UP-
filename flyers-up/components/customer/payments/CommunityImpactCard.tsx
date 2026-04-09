'use client';

import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';

type Props = {
  prosSupported: number;
  monthLabel: string;
};

export function CommunityImpactCard({ prosSupported, monthLabel }: Props) {
  return (
    <section className="rounded-[1.25rem] bg-gradient-to-br from-[#E89540] to-[#d97d28] p-5 text-white shadow-md ring-1 ring-black/10">
      <HeartHandshake className="h-7 w-7 opacity-95" aria-hidden />
      <h2 className="mt-3 text-lg font-bold">Community support</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/95">
        You supported{' '}
        <span className="font-bold">{prosSupported}</span> local professional{prosSupported === 1 ? '' : 's'} in{' '}
        {monthLabel}. Way to go!
      </p>
      <Link
        href="/top-pros"
        className="mt-4 inline-block text-sm font-semibold underline decoration-white/50 underline-offset-4 hover:decoration-white"
      >
        View impact
      </Link>
    </section>
  );
}
