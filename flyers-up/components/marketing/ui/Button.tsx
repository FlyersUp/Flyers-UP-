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
  /** ACTION only — high contrast, must read as “do this” */
  primary:
    'bg-market-orange text-white shadow-[0_4px_18px_rgba(255,179,71,0.55)] hover:bg-market-orange-hover active:scale-[0.99] border-2 border-[#E89540] hover:border-[#D88530] focus-visible:ring-market-orange focus-visible:ring-offset-market-linen',
  /** Neutral surface on linen */
  ghost:
    'border-2 border-market-line bg-white text-market-slate shadow-sm hover:bg-market-cloud hover:border-market-slate/30 focus-visible:ring-market-slate focus-visible:ring-offset-market-linen',
  /** Structural secondary — slate frame, no orange */
  outline:
    'border-2 border-market-slate/35 bg-white text-market-slate shadow-sm hover:border-market-slate/55 hover:bg-market-cloud/50 focus-visible:ring-market-slate focus-visible:ring-offset-market-linen',
  /** Only for overlays on slate (e.g. legacy) */
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
