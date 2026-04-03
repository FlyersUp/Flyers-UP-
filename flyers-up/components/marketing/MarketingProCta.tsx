import { MarketingButton } from '@/components/marketing/ui/Button';
import { MarketingSection } from '@/components/marketing/ui/Section';

export function MarketingProCta() {
  return (
    <MarketingSection className="border-t border-market-line bg-market-linen py-12 md:py-14">
      <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-market-line bg-market-cloud/80 px-6 py-8 shadow-[0_2px_12px_rgba(45,52,54,0.05)] md:flex-row md:px-10 md:py-10">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-market-slate sm:text-2xl">Are you a local pro?</h2>
          <p className="mt-2 max-w-lg text-market-charcoal/75">
            Pick up structured requests, stay organized, and build trust on your block.
          </p>
        </div>
        <MarketingButton href="/signup?role=pro" variant="primary" className="shrink-0 px-8 py-3.5">
          Join as a pro
        </MarketingButton>
      </div>
    </MarketingSection>
  );
}
