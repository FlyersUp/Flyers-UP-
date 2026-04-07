import { ArrowRight, ShieldCheck } from 'lucide-react';
import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { MarketingButton } from '@/components/marketing/ui/Button';

const TRUST_BAR_ITEMS = ['Verified Pros', 'Upfront Pricing', 'Clear Expectations', 'Secure Payments'] as const;

/** First quote — kept in sync with `MarketingTestimonials` hero-style pull quote. */
const HERO_PULL_QUOTE = 'Found a cleaner same day. Super smooth.' as const;

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-market-linen to-market-linen px-4 pb-16 pt-8 md:pb-20 md:pt-12">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-market-orange/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-32 bottom-24 h-64 w-64 rounded-full bg-market-slate/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-market-orange/25 bg-market-orange/10 px-3 py-1 text-xs font-semibold text-market-charcoal">
            <ShieldCheck className="h-3.5 w-3.5 text-market-slate" strokeWidth={2.25} aria-hidden />
            {TRUST_BAR_ITEMS[0]}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-market-slate sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
            Hire reliable local pros without the usual{' '}
            <span className="text-market-orange">stress</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-market-charcoal sm:text-xl">
            Verified pros, clear pricing, and a simple step-by-step process—from request to completion.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <MarketingButton
              href="/signup?role=customer"
              variant="primary"
              className="w-full min-w-[220px] px-8 py-4 text-base font-bold shadow-[0_6px_24px_rgba(255,179,71,0.5)] sm:w-auto"
            >
              Request a Service
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </MarketingButton>
            <MarketingButton
              href="#browse-occupations"
              variant="outline"
              className="w-full min-w-[200px] border-sky-200/80 bg-sky-50 px-8 py-4 text-base font-semibold hover:bg-sky-100/90 sm:w-auto"
            >
              Browse Services
            </MarketingButton>
          </div>
          <p className="mx-auto mt-5 max-w-xl text-center text-sm text-market-charcoal">
            No commitment. Compare options. Hire only when you&apos;re ready.
          </p>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold text-market-slate"
            role="list"
            aria-label="Trust highlights"
          >
            {TRUST_BAR_ITEMS.map((label, i) => (
              <span key={label} className="flex items-center gap-x-3" role="listitem">
                {i > 0 ? (
                  <span className="text-market-slate/50" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-12 max-w-2xl lg:max-w-none">
          <div className="overflow-hidden rounded-3xl border border-market-line/80 bg-white shadow-[0_12px_40px_rgba(74,105,189,0.12),0_4px_12px_rgba(45,52,54,0.06)]">
            <HeroIllustration
              variant="default"
              className="h-auto w-full max-h-[min(280px,48vw)] md:max-h-[320px]"
            />
          </div>
          <figure className="absolute bottom-4 left-4 right-4 max-w-[min(100%,20rem)] rounded-2xl border border-market-line/90 bg-white/95 p-4 text-left shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-auto">
            <blockquote>
              <p className="text-sm font-medium leading-relaxed text-market-charcoal">
                &ldquo;{HERO_PULL_QUOTE}&rdquo;
              </p>
            </blockquote>
            <figcaption className="mt-3 text-xs font-semibold uppercase tracking-wide text-market-slate">
              Flyers Up customer
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
