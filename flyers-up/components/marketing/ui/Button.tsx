import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'outline';
  onClick?: () => void;
  disabled?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-slate focus-visible:ring-offset-2 focus-visible:ring-offset-market-linen disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary:
    'bg-market-orange text-white shadow-sm hover:bg-market-orange-hover active:scale-[0.99] border border-market-orange-hover/30',
  ghost:
    'border-2 border-market-line bg-white/80 text-market-slate hover:bg-market-cloud hover:border-market-slate/20',
  outline: 'border-2 border-market-slate/20 text-market-slate hover:bg-white/90 bg-white/60',
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
