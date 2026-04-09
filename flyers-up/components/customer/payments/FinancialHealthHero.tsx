'use client';

type Props = {
  title?: string;
  subtitle?: string;
};

export function FinancialHealthHero({
  title = 'Financial health',
  subtitle = 'Keep track of your neighborhood service contributions and digital receipts in one secure place.',
}: Props) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[hsl(var(--accent-customer)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-customer)/0.12)] via-white to-[hsl(var(--trust)/0.08)] p-5 shadow-sm dark:from-white/[0.08] dark:via-[#1a1d24] dark:to-[#1a1d24] dark:border-white/10">
      <h2 className="text-xl font-bold text-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-text2">{subtitle}</p>
      <div
        className="mt-4 h-28 w-full rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 ring-1 ring-black/5 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"
        role="img"
        aria-hidden
      />
    </section>
  );
}
