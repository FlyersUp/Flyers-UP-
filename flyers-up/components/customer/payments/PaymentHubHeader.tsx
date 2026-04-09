'use client';

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function PaymentHubHeader({ eyebrow, title, description, className = '' }: Props) {
  return (
    <header className={`mt-4 space-y-3 ${className}`}>
      <span className="inline-block rounded-full bg-[hsl(var(--accent-customer)/0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--accent-customer))] ring-1 ring-[hsl(var(--accent-customer)/0.2)]">
        {eyebrow}
      </span>
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-text sm:text-[1.65rem]">{title}</h1>
      <p className="max-w-lg text-[15px] leading-relaxed text-text2">{description}</p>
    </header>
  );
}
