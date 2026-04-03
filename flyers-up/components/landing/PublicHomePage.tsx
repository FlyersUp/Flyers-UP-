'use client';

/**
 * Landing — Flyers Up public home (marketing palette + occupations browse).
 */

import { useEffect, useRef, useState } from 'react';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { MarketingCategoryCard } from '@/components/marketing/MarketingCategoryCard';
import { MarketingHowItWorks } from '@/components/marketing/MarketingHowItWorks';
import { MarketingProblemSolution } from '@/components/marketing/MarketingProblemSolution';
import { MarketingValueStack } from '@/components/marketing/MarketingValueStack';
import { MarketingTestimonials } from '@/components/marketing/MarketingTestimonials';
import { MarketingRiskReversal } from '@/components/marketing/MarketingRiskReversal';
import { MarketingProCta } from '@/components/marketing/MarketingProCta';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingButton } from '@/components/marketing/ui/Button';
import { MarketingSection } from '@/components/marketing/ui/Section';

type Occupation = { id: string; name: string; slug: string; icon: string | null; featured: boolean };

const FALLBACK_FEATURED: Occupation[] = [
  { id: 'fallback-cleaner', name: 'Cleaner', slug: 'cleaner', icon: null, featured: true },
  { id: 'fallback-handyman', name: 'Handyman', slug: 'handyman', icon: null, featured: true },
  { id: 'fallback-dog', name: 'Dog Walker', slug: 'dog-walker', icon: null, featured: true },
];

export default function PublicHomePage() {
  const [featuredOccupations, setFeaturedOccupations] = useState<Occupation[]>([]);
  const [allOccupations, setAllOccupations] = useState<Occupation[]>([]);
  const [allOccupationsLoading, setAllOccupationsLoading] = useState(false);
  const [showAllOccupations, setShowAllOccupations] = useState(false);
  const [proClosedBanner, setProClosedBanner] = useState(false);
  const browseOccupationsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('fu_pro_account_closed')) {
        sessionStorage.removeItem('fu_pro_account_closed');
        setProClosedBanner(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch('/api/occupations?featured=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setFeaturedOccupations(data.occupations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showAllOccupations || allOccupations.length > 0) return;
    let cancelled = false;
    setAllOccupationsLoading(true);
    fetch('/api/occupations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAllOccupations(data.occupations ?? []);
      })
      .catch(() => {
        if (!cancelled) setAllOccupations([]);
      })
      .finally(() => {
        if (!cancelled) setAllOccupationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAllOccupations, allOccupations.length]);

  useEffect(() => {
    if (!showAllOccupations || allOccupationsLoading) return;
    const id = window.requestAnimationFrame(() => {
      browseOccupationsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showAllOccupations, allOccupationsLoading]);

  const displayFeatured =
    featuredOccupations.length > 0 ? featuredOccupations.slice(0, 6) : FALLBACK_FEATURED;

  return (
    <div className="min-h-screen bg-market-linen text-market-charcoal">
      {proClosedBanner ? (
        <div
          className="border-b border-market-line bg-market-teal/15 px-4 py-3 text-center text-sm text-market-charcoal"
          role="status"
        >
          Your account has been closed. You’ve been signed out.{' '}
          <button
            type="button"
            onClick={() => setProClosedBanner(false)}
            className="font-medium text-market-slate underline decoration-market-line underline-offset-2 hover:text-market-slate/90"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <MarketingNavbar />
      <MarketingHero />

      <MarketingSection
        ref={browseOccupationsSectionRef}
        id="browse-occupations"
        aria-label="Browse services by occupation"
        className="scroll-mt-20 bg-market-linen"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
            Popular services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-market-charcoal">
            Browse categories, compare pros, and book when it feels right.
          </p>
        </div>
        <div
          id="landing-occupations-panel"
          role="region"
          aria-live="polite"
          aria-label={showAllOccupations ? 'All occupations' : 'Featured occupations'}
          className="mt-10"
        >
          {!showAllOccupations ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayFeatured.map((occ) => (
                <MarketingCategoryCard key={occ.id} name={occ.name} slug={occ.slug} />
              ))}
            </div>
          ) : allOccupationsLoading && allOccupations.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl border border-market-line/90 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
              <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-market-slate">
                All occupations
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allOccupations.map((occ) => (
                  <MarketingCategoryCard key={occ.id} name={occ.name} slug={occ.slug} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-10 text-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-market-slate/30 bg-white px-6 py-3.5 text-sm font-semibold text-market-slate shadow-[0_4px_16px_rgba(45,52,54,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-market-slate/50 hover:bg-market-cloud/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-slate focus-visible:ring-offset-2 focus-visible:ring-offset-market-linen"
            aria-expanded={showAllOccupations}
            aria-controls="landing-occupations-panel"
            onClick={() => setShowAllOccupations((v) => !v)}
          >
            {showAllOccupations ? 'Show less' : 'More occupations'}
          </button>
        </div>
      </MarketingSection>

      <MarketingHowItWorks />
      <MarketingProblemSolution />
      <MarketingValueStack />
      <MarketingTestimonials />
      <MarketingRiskReversal />
      <MarketingProCta />

      <MarketingSection className="bg-market-linen pb-20 pt-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-market-slate sm:text-3xl">
            Find the right pro for your job today
          </h2>
          <p className="mt-3 text-lg text-market-charcoal">
            Request a service, compare options, and hire with confidence.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingButton
              href="/signup?role=customer"
              variant="primary"
              className="min-w-[220px] px-8 py-4 text-base font-bold shadow-[0_6px_24px_rgba(255,179,71,0.5)]"
            >
              Request a Service (Free)
            </MarketingButton>
          </div>
        </div>
      </MarketingSection>

      <MarketingFooter />
    </div>
  );
}
