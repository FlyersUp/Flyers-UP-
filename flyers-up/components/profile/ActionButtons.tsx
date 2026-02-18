import Link from 'next/link';

export function ActionButtons({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  secondaryTitle,
  secondaryDisabledText,
  tertiaryHref,
  tertiaryLabel,
  tertiaryDisabledText,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string | null;
  secondaryLabel: string;
  secondaryTitle?: string;
  secondaryDisabledText?: string;
  tertiaryHref?: string | null;
  tertiaryLabel: string;
  tertiaryDisabledText?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Link
        href={primaryHref}
        className="col-span-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 bg-accent text-accentContrast font-semibold text-sm hover:opacity-95 transition-opacity focus-ring btn-press"
      >
        {primaryLabel}
      </Link>

      {secondaryHref ? (
        <Link
          href={secondaryHref}
          title={secondaryTitle}
          className="col-span-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 bg-white border border-hairline text-text font-semibold text-sm hover:shadow-sm transition-shadow focus-ring btn-press"
        >
          {secondaryLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          title={secondaryDisabledText || 'Available after you start a booking'}
          className="col-span-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 bg-white border border-hairline text-muted/60 font-semibold text-sm cursor-not-allowed"
        >
          {secondaryLabel}
        </button>
      )}

      {tertiaryHref ? (
        <Link
          href={tertiaryHref}
          className="col-span-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 bg-white border border-hairline text-text font-semibold text-sm hover:shadow-sm transition-shadow focus-ring btn-press"
        >
          {tertiaryLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          title={tertiaryDisabledText || 'Not available'}
          className="col-span-1 inline-flex items-center justify-center rounded-xl px-3 py-2.5 bg-white border border-hairline text-muted/60 font-semibold text-sm cursor-not-allowed"
        >
          {tertiaryLabel}
        </button>
      )}
    </div>
  );
}

