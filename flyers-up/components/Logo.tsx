/**
 * Flyers Up Logo Component
 * Reusable logo with different size variants.
 * variant="header": horizontal one-line layout for header (premium civic feel).
 */

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkToHome?: boolean;
  className?: string;
  /** header = horizontal "FLYERS UP" with accent on UP; default = stacked legacy */
  variant?: 'default' | 'header';
}

const sizeConfig = {
  sm: { boxW: 100, boxH: 30, textClass: 'text-[14px]', iconClass: 'w-6 h-10', gapClass: 'gap-2' },
  md: { boxW: 140, boxH: 42, textClass: 'text-[18px]', iconClass: 'w-7 h-12', gapClass: 'gap-3' },
  lg: { boxW: 200, boxH: 60, textClass: 'text-[24px]', iconClass: 'w-9 h-14', gapClass: 'gap-3.5' },
};

const headerSizeConfig = {
  sm: { textClass: 'text-base sm:text-lg' },
  md: { textClass: 'text-lg sm:text-xl' },
  lg: { textClass: 'text-xl sm:text-2xl' },
};

export default function Logo({
  size = 'md',
  linkToHome = true,
  className = '',
  variant = 'default',
}: LogoProps) {
  if (variant === 'header') {
    const { textClass } = headerSizeConfig[size];
    const logoElement = (
      <span
        className={[
          'inline-flex items-baseline select-none whitespace-nowrap',
          'uppercase font-extrabold tracking-[0.5px]',
          textClass,
          'text-[#1A1A1A]',
          'transition-opacity duration-150 ease-out hover:opacity-100 opacity-[0.97]',
          className,
        ].join(' ')}
        style={{
          fontFamily:
            'var(--font-oswald), var(--font-montserrat), system-ui, -apple-system, Segoe UI, sans-serif',
        }}
        aria-label="Flyers Up"
      >
        FLYERS{' '}
        <span className="border-b-2 border-[#B2FBA5]">UP</span>
      </span>
    );
    if (linkToHome) {
      return (
        <Link href="/" className="flex items-center">
          {logoElement}
        </Link>
      );
    }
    return logoElement;
  }

  const { boxW, boxH, textClass, iconClass, gapClass } = sizeConfig[size];

  const logoElement = (
    <div
      className={[
        'inline-flex items-center justify-center',
        gapClass,
        'text-[#058954]',
        'shrink-0',
        className,
      ].join(' ')}
      style={{ width: boxW, height: boxH }}
      aria-label="Flyers Up"
    >
      <div
        className={[
          'uppercase font-bold leading-[0.88] tracking-tight text-center',
          'select-none',
          textClass,
        ].join(' ')}
        style={{
          fontFamily:
            'var(--font-oswald), var(--font-montserrat), system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div>FLYERS</div>
        <div>UP</div>
      </div>
      <LogoIcon className={['flex-none', iconClass].join(' ')} />
    </div>
  );

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

// Icon-only version (just the signpost)
export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 44 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Flyers Up signpost"
    >
      {/* Pole */}
      <rect x="20" y="18" width="4" height="44" fill="currentColor" rx="1" />

      {/* Arrow up */}
      <path
        d="M22 4 L22 16 M15 10 L22 4 L29 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flyers (staggered) */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top flyer */}
        <rect x="27" y="10" width="15" height="12" rx="2" />
        <circle cx="30" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <line x1="30" y1="15.5" x2="39" y2="15.5" strokeWidth="1.6" />
        <line x1="30" y1="18.8" x2="36.5" y2="18.8" strokeWidth="1.6" />

        {/* Middle flyer */}
        <rect x="29" y="26" width="15" height="12" rx="2" />
        <circle cx="32" cy="28" r="1.2" fill="currentColor" stroke="none" />
        <line x1="32" y1="31.5" x2="41" y2="31.5" strokeWidth="1.6" />
        <line x1="32" y1="34.8" x2="38.5" y2="34.8" strokeWidth="1.6" />

        {/* Bottom flyer */}
        <rect x="27" y="42" width="15" height="11" rx="2" />
        <circle cx="30" cy="44" r="1.2" fill="currentColor" stroke="none" />
        <line x1="30" y1="47.5" x2="39" y2="47.5" strokeWidth="1.6" />
      </g>

      {/* Grass */}
      <path
        d="M12 62 L17 55 L20 62 M20 62 L23 53 L26 62 M26 62 L30 56 L34 62"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}




