import { ReactNode } from 'react';

export function OfficialBadge({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center h-7 px-2.5 rounded-full border',
        'bg-badgeFill border-badgeBorder',
        'text-[11px] uppercase tracking-wide font-medium text-text',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

