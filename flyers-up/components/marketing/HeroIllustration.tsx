/**
 * Soft sage brownstones + trees — decorative hero art (no inline styles).
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="800" height="280" className="fill-market-linen" />
      {/* Ground */}
      <path
        d="M0 220 Q200 200 400 210 T800 205 L800 280 L0 280 Z"
        className="fill-market-sage/25"
      />
      {/* Trees */}
      <g className="fill-market-sage/70">
        <ellipse cx="120" cy="168" rx="28" ry="44" />
        <rect x="112" y="188" width="16" height="36" rx="2" className="fill-market-sage/50" />
        <ellipse cx="680" cy="162" rx="32" ry="48" />
        <rect x="672" y="184" width="16" height="40" rx="2" className="fill-market-sage/45" />
        <ellipse cx="520" cy="175" rx="22" ry="36" />
        <rect x="514" y="192" width="12" height="32" rx="2" className="fill-market-sage/40" />
      </g>
      {/* Brownstones row */}
      <g className="stroke-market-sage/90" strokeWidth="2" fill="none">
        <path d="M80 220 V140 H200 V220" className="fill-market-cloud" />
        <path d="M200 220 V125 H320 V220" className="fill-market-cloud" />
        <path d="M320 220 V135 H440 V220" className="fill-market-cloud/80" />
        <path d="M440 220 V118 H560 V220" className="fill-market-cloud" />
        <path d="M560 220 V128 H680 V220" className="fill-market-cloud" />
      </g>
      {/* Windows — slate blue hint */}
      <g className="fill-market-slate/35">
        <rect x="110" y="155" width="14" height="18" rx="1" />
        <rect x="135" y="155" width="14" height="18" rx="1" />
        <rect x="230" y="145" width="16" height="20" rx="1" />
        <rect x="258" y="145" width="16" height="20" rx="1" />
        <rect x="350" y="152" width="14" height="18" rx="1" />
        <rect x="375" y="152" width="14" height="18" rx="1" />
        <rect x="470" y="138" width="16" height="22" rx="1" />
        <rect x="500" y="138" width="16" height="22" rx="1" />
        <rect x="590" y="148" width="14" height="18" rx="1" />
        <rect x="615" y="148" width="14" height="18" rx="1" />
      </g>
    </svg>
  );
}
