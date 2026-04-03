import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { MarketingButton } from '@/components/marketing/ui/Button';

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-market-linen px-4 pb-16 pt-12 md:pb-24 md:pt-16">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-market-sage/10 to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-market-slate sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
            Hire trusted local pros with clearer expectations.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-market-charcoal sm:text-xl">
            Verified pros. Transparent pricing. Reliable service.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <MarketingButton href="/signup?role=customer" variant="primary" className="w-full min-w-[200px] px-8 py-4 text-base sm:w-auto">
              Request a Service (Free)
            </MarketingButton>
            <MarketingButton href="#browse-occupations" variant="ghost" className="w-full min-w-[200px] px-8 py-4 text-base sm:w-auto">
              Browse Services
            </MarketingButton>
          </div>
        </div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-market-line bg-market-linen shadow-[0_8px_30px_rgba(45,52,54,0.06)]">
          <HeroIllustration className="h-auto w-full max-h-[min(260px,42vw)] md:max-h-[300px]" />
        </div>
      </div>
    </section>
  );
}
