import { Check } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/ui/Section';

const customerPoints = ['Verified pros', 'Clear pricing', 'Reliable service'] as const;
const proPoints = ['Get local jobs', 'Grow your business', 'Flexible scheduling'] as const;

export function MarketingTrustSection() {
  return (
    <MarketingSection id="for-customers" className="bg-market-linen">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="rounded-2xl border border-market-line/90 bg-white p-8 shadow-[0_4px_24px_rgba(74,105,189,0.08)] md:p-10">
          <h2 className="text-2xl font-bold text-market-slate sm:text-3xl">For customers</h2>
          <p className="mt-2 text-market-charcoal">
            Hire with confidence in your own neighborhood.
          </p>
          <ul className="mt-6 space-y-4">
            {customerPoints.map((label) => (
              <li key={label} className="flex items-start gap-3 text-market-charcoal">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-market-teal/20">
                  <Check className="h-4 w-4 text-market-teal" strokeWidth={2.75} aria-hidden />
                </span>
                <span className="pt-0.5 font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          id="for-pros"
          className="scroll-mt-24 rounded-2xl border border-market-line/90 bg-white p-8 shadow-[0_4px_24px_rgba(74,105,189,0.08)] md:p-10"
        >
          <h2 className="text-2xl font-bold text-market-slate sm:text-3xl">For pros</h2>
          <p className="mt-2 text-market-charcoal">
            Local demand, clear requests, and room to build a reputation.
          </p>
          <ul className="mt-6 space-y-4">
            {proPoints.map((label) => (
              <li key={label} className="flex items-start gap-3 text-market-charcoal">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-market-teal/20">
                  <Check className="h-4 w-4 text-market-teal" strokeWidth={2.75} aria-hidden />
                </span>
                <span className="pt-0.5 font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MarketingSection>
  );
}
