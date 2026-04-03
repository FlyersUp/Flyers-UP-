import { MarketingSection } from '@/components/marketing/ui/Section';

const items = [
  { title: 'Verified Pros', body: 'Every pro is reviewed before joining.' },
  { title: 'Transparent Pricing', body: 'Know costs upfront.' },
  { title: 'Clear Expectations', body: 'No surprises during the job.' },
  { title: 'Secure Payments', body: 'Protected transactions.' },
  { title: 'Simple Booking Flow', body: 'From request to completion in one place.' },
] as const;

export function MarketingValueStack() {
  return (
    <MarketingSection className="bg-market-linen">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          Everything you need to hire with confidence
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-market-line/90 bg-white p-6 shadow-[0_4px_20px_rgba(45,52,54,0.07)]"
          >
            <h3 className="text-lg font-semibold text-market-slate">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-market-charcoal">{body}</p>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
