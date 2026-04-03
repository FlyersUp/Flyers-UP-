import { Check } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/ui/Section';

const points = [
  "Only pay when you're ready",
  'Clear pricing before booking',
  'Support if something goes wrong',
] as const;

export function MarketingRiskReversal() {
  return (
    <MarketingSection className="bg-market-linen">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-market-slate sm:text-3xl">Book with confidence</h2>
        <ul className="mt-8 space-y-4 text-left">
          {points.map((label) => (
            <li
              key={label}
              className="flex items-start gap-3 rounded-2xl border border-market-line/90 bg-white p-6 shadow-[0_4px_20px_rgba(45,52,54,0.07)] text-market-charcoal"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-market-teal/20">
                <Check className="h-4 w-4 text-market-teal" strokeWidth={2.75} aria-hidden />
              </span>
              <span className="pt-0.5 font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </MarketingSection>
  );
}
