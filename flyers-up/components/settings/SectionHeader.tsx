'use client';

/**
 * Consistent section header: small uppercase label + divider.
 */
interface SectionHeaderProps {
  label: string;
  className?: string;
}

export function SectionHeader({ label, className = '' }: SectionHeaderProps) {
  return (
    <div className={`pb-2 mb-3 border-b border-black/5 ${className}`}>
      <span className="text-xs font-semibold tracking-wider text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
