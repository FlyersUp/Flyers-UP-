'use client';

interface EmptyStateProps {
  variant: 'list' | 'thread';
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaTooltip?: string;
  onCtaClick?: () => void;
}

function MessageIcon() {
  return (
    <svg
      className="w-12 h-12 text-[#6B7280] dark:text-[#71717A] mx-auto opacity-60"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

export function EmptyState({
  variant,
  title,
  subtitle,
  ctaLabel,
  ctaDisabled = false,
  ctaTooltip,
  onCtaClick,
}: EmptyStateProps) {
  const isList = variant === 'list';

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-[#222225] border border-[#E5E5E5] dark:border-white/10 shadow-sm p-8 text-center ${
        isList ? 'max-w-md mx-auto' : ''
      }`}
    >
      <MessageIcon />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-[#6B7280] max-w-xs mx-auto">{subtitle}</p>
      {ctaLabel && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onCtaClick}
            disabled={ctaDisabled}
            title={ctaDisabled ? ctaTooltip : undefined}
            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus:outline-none ${
              ctaDisabled
                ? 'bg-gray-100 dark:bg-[#2A2A2E] text-gray-500 dark:text-[#71717A] cursor-not-allowed'
                : 'bg-accent text-accentContrast hover:opacity-90'
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}
