'use client';

import { ShieldCheck } from 'lucide-react';

export interface BookingProtectionCardProps {
  className?: string;
}

export function BookingProtectionCard({ className = '' }: BookingProtectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-emerald-200/40 dark:border-emerald-800/35 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-4 flex gap-3 min-w-0 ${className}`}
      aria-labelledby="protection-heading"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 id="protection-heading" className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA]">
          Protected by Flyers Up
        </h2>
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-1 leading-relaxed">
          Local guarantee, human support, and clear policies so you can book with confidence.
        </p>
      </div>
    </section>
  );
}
