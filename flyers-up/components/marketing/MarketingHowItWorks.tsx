import { RequestIcon, MatchIcon, MessageIcon, ScheduleIcon } from '@/components/Icons';
import { MarketingSection } from '@/components/marketing/ui/Section';

const steps = [
  {
    n: 1,
    title: 'Request your service',
    description: 'Tell us what you need and when you need it.',
    Icon: RequestIcon,
  },
  {
    n: 2,
    title: 'Compare qualified pros',
    description: 'View pricing, profiles, and availability.',
    Icon: MatchIcon,
  },
  {
    n: 3,
    title: 'Book with clarity',
    description: "Know exactly what's included before the job starts.",
    Icon: MessageIcon,
  },
  {
    n: 4,
    title: 'Get it done right',
    description: 'Track progress and pay securely through the app.',
    Icon: ScheduleIcon,
  },
] as const;

export function MarketingHowItWorks() {
  return (
    <MarketingSection id="how-it-works" className="bg-market-linen">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-market-slate">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          How Flyers Up works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-market-charcoal">
          A straightforward path from request to completion.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
        {steps.map(({ n, title, description, Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-market-line/90 bg-white p-6 text-center shadow-[0_4px_20px_rgba(45,52,54,0.07)] md:text-left"
          >
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-market-orange text-base font-bold text-white md:mx-0">
              {n}
            </div>
            <div className="mx-auto mb-4 flex h-fit w-fit items-center justify-center rounded-full bg-market-cloud p-4 text-market-slate ring-1 ring-market-line md:mx-0">
              <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h3 className="text-lg font-semibold text-market-slate">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-market-charcoal">{description}</p>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
