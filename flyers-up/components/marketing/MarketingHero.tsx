import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { MarketingButton } from '@/components/marketing/ui/Button';

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-market-linen px-4 pb-16 pt-10 md:pb-20 md:pt-14">
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-market-slate sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
            Hire trusted local pros with clearer expectations.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-market-charcoal sm:text-xl">
            Verified pros. Transparent pricing. Reliable service.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <MarketingButton
              href="/signup?role=customer"
              variant="primary"
              className="w-full min-w-[220px] px-8 py-4 text-base font-bold shadow-[0_6px_24px_rgba(255,179,71,0.5)] sm:w-auto"
            >
              Request a Service (Free)
            </MarketingButton>
            <MarketingButton
              href="#browse-occupations"
              variant="outline"
              className="w-full min-w-[200px] px-8 py-4 text-base font-semibold sm:w-auto"
            >
              Browse Services
            </MarketingButton>
          </div>
        </div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-market-line/80 bg-white shadow-[0_8px_32px_rgba(74,105,189,0.08),0_2px_8px_rgba(45,52,54,0.06)]">
          <HeroIllustration
            variant="default"
            className="h-auto w-full max-h-[min(260px,42vw)] md:max-h-[300px]"
          />
        </div>
      </div>
    </section>
  );
}
