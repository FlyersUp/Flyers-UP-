import { RequestIcon, MatchIcon, ScheduleIcon } from '@/components/Icons';
import { MarketingSection } from '@/components/marketing/ui/Section';

const steps = [
  {
    n: 1,
    title: 'Request',
    description: 'Describe what you need and when—so pros can respond with clarity.',
    Icon: RequestIcon,
  },
  {
    n: 2,
    title: 'Match',
    description: 'Compare verified local pros who fit your job and budget.',
    Icon: MatchIcon,
  },
  {
    n: 3,
    title: 'Schedule',
    description: 'Confirm details in writing and lock in a time that works.',
    Icon: ScheduleIcon,
  },
] as const;

export function MarketingHowItWorks() {
  return (
    <MarketingSection id="how-it-works" className="bg-market-linen">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-market-slate">
          How it works
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          Three calm steps
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-market-charcoal">
          Built for neighbors—not anonymous gig churn.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
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
