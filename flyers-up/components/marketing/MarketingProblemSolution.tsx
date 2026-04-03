import { Check } from 'lucide-react';
import { MarketingSection } from '@/components/marketing/ui/Section';

const problems = [
  'No clear pricing',
  'Pros not showing up',
  'Miscommunication about the job',
  'Wasting time going back and forth',
] as const;

const solutions = [
  'Verified professionals',
  'Transparent pricing',
  'Clear job expectations',
  'Structured booking flow',
] as const;

export function MarketingProblemSolution() {
  return (
    <MarketingSection id="for-customers" className="bg-market-linen">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          Hiring local help shouldn&apos;t feel risky
        </h2>
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="rounded-2xl border border-market-line/90 bg-white p-8 shadow-[0_4px_24px_rgba(74,105,189,0.08)] md:p-10">
          <ul className="space-y-4">
            {problems.map((label) => (
              <li key={label} className="text-market-charcoal">
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-market-line/90 bg-white p-8 shadow-[0_4px_24px_rgba(74,105,189,0.08)] md:p-10">
          <ul className="space-y-4">
            {solutions.map((label) => (
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
