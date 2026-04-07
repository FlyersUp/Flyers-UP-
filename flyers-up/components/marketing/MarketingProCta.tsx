import Link from 'next/link';
import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { MarketingSection } from '@/components/marketing/ui/Section';

export function MarketingProCta() {
  return (
    <MarketingSection id="for-pros" className="bg-market-linen py-12 md:py-16">
      <div className="overflow-hidden rounded-3xl border border-sky-200/60 bg-gradient-to-b from-sky-50 to-sky-100/40 px-6 py-10 shadow-[0_8px_32px_rgba(74,105,189,0.08)] md:px-10 md:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-market-slate sm:text-3xl">Are you a local pro?</h2>
          <p className="mt-3 text-lg text-market-charcoal">
            Pick up structured requests, stay organized, and build trust on your block.
          </p>
          <div className="mt-8">
            <Link
              href="/signup?role=pro"
              className="inline-flex items-center justify-center rounded-2xl bg-market-slate px-8 py-3.5 text-base font-bold text-white shadow-[0_6px_20px_rgba(74,105,189,0.35)] transition-all duration-200 hover:bg-market-slate/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-slate focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50 active:scale-[0.99]"
            >
              Join as a pro
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-white/80 bg-white shadow-md">
          <HeroIllustration variant="default" className="h-auto w-full max-h-[min(220px,40vw)] md:max-h-[260px]" />
        </div>
      </div>
    </MarketingSection>
  );
}
