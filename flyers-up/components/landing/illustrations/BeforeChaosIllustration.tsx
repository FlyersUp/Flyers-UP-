/**
 * Before: muddy yellows + greys, shaky lines, confusing bubbles, faceless “shadow” pro.
 * Anchor #2C2825 for crisp outlines.
 */
const A = '#2C2825';
const MUDDY = '#EDE8D0';
const MUDDY_DEEP = '#D9D0B8';
const MUDDY_GREY = '#C9C2AE';
const SHADOW = '#A8A090';
const PALE_YELLOW = '#F5F0DC';

export function BeforeChaosIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Chaos before</title>
      <rect width="400" height="220" rx="16" fill={PALE_YELLOW} />

      {/* Shaky scribbles */}
      <path
        d="M24 48l6-4 10 14-8 6 12 10M140 36l-8 12 14-6 6 18"
        stroke={MUDDY_GREY}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M20 172c45-8 85 12 125-6s95 8 135-10"
        stroke={MUDDY_DEEP}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M260 52q20 18 40 8t35 22"
        stroke={MUDDY_GREY}
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />

      {/* Overlapping confusing bubbles */}
      <ellipse cx="95" cy="88" rx="54" ry="38" fill={MUDDY} stroke={A} strokeWidth="2" transform="rotate(-8 95 88)" />
      <rect x="62" y="74" width="58" height="6" rx="2" fill={MUDDY_DEEP} transform="rotate(-6 91 77)" />
      <rect x="66" y="86" width="44" height="5" rx="1" fill={MUDDY_GREY} opacity="0.7" />

      <ellipse cx="218" cy="72" rx="50" ry="34" fill={MUDDY_DEEP} stroke={A} strokeWidth="2" transform="rotate(10 218 72)" />
      <rect x="192" y="62" width="42" height="5" rx="1" fill={MUDDY} />
      <rect x="196" y="72" width="30" height="4" rx="1" fill={SHADOW} opacity="0.5" />

      <ellipse cx="288" cy="118" rx="58" ry="40" fill={MUDDY} stroke={A} strokeWidth="2" transform="rotate(-5 288 118)" />
      <rect x="252" y="104" width="50" height="6" rx="2" fill={MUDDY_GREY} />
      <rect x="258" y="116" width="36" height="5" rx="1" fill={MUDDY_DEEP} />

      {/* Shadow pro — no face */}
      <ellipse cx="200" cy="178" rx="28" ry="32" fill={SHADOW} stroke={A} strokeWidth="2.5" />
      <circle cx="200" cy="150" r="22" fill={MUDDY_GREY} stroke={A} strokeWidth="2.5" />
      {/* Intentionally empty "face" — no eyes/mouth */}
      <path
        d="M188 152h24"
        stroke={A}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <text x="148" y="208" fill={A} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="700">
        Who’s actually showing up?
      </text>
    </svg>
  );
}
