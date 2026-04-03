import { MarketingSection } from '@/components/marketing/ui/Section';

const quotes = [
  { quote: 'Found a cleaner same day. Super smooth.' },
  { quote: 'Way easier than calling around.' },
  { quote: 'I knew exactly what I was paying.' },
] as const;

export function MarketingTestimonials() {
  return (
    <MarketingSection className="bg-market-linen">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          Customers trust Flyers Up
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {quotes.map(({ quote }) => (
          <figure
            key={quote}
            className="rounded-2xl border border-market-line/90 bg-white p-6 text-center shadow-[0_4px_20px_rgba(45,52,54,0.07)] md:text-left"
          >
            <blockquote className="text-sm leading-relaxed text-market-charcoal">
              <p className="font-medium">&ldquo;{quote}&rdquo;</p>
            </blockquote>
            <figcaption className="mt-4 text-xs font-semibold uppercase tracking-wide text-market-slate">
              Flyers Up customer
            </figcaption>
          </figure>
        ))}
      </div>
    </MarketingSection>
  );
}
