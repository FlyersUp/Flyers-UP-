import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'outline' | 'ghostOnSlate';
  onClick?: () => void;
  disabled?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary:
    'bg-market-orange text-white shadow-md hover:bg-market-orange-hover active:scale-[0.99] border border-market-orange-hover/40 focus-visible:ring-market-orange/80 focus-visible:ring-offset-market-linen',
  ghost:
    'border-2 border-market-line bg-white/90 text-market-slate hover:bg-market-cloud hover:border-market-slate/25 focus-visible:ring-market-slate focus-visible:ring-offset-market-linen',
  outline: 'border-2 border-market-slate/25 text-market-slate hover:bg-white/90 bg-white/70 focus-visible:ring-market-slate focus-visible:ring-offset-market-linen',
  /** Secondary CTA on slate-blue hero (white outline + label) */
  ghostOnSlate:
    'border-2 border-white/85 bg-transparent text-white hover:bg-white/10 hover:border-white focus-visible:ring-white focus-visible:ring-offset-market-slate',
};

export function MarketingButton({
  children,
  className,
  href,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled,
}: ButtonProps) {
  const cls = cn(base, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
