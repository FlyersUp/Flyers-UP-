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
    <MarketingSection id="how-it-works" className="bg-white">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-market-slate">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          How Flyers Up works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-market-charcoal">
          A straightforward path from request to completion.
        </p>
      </div>
      <div className="mx-auto mt-12 flex max-w-lg flex-col gap-10">
        {steps.map(({ n, title, description, Icon }) => (
          <div key={title} className="flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-market-slate text-base font-bold text-white shadow-sm">
              {n}
            </div>
            <div className="mt-4 flex items-center justify-center rounded-full bg-blue-50 p-4 text-market-slate">
              <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-market-slate">{title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-market-charcoal">{description}</p>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
