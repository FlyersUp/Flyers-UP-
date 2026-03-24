/**
 * Hero: cream shell panels, apricot customer + handshake bridge, sage verified pro + shield.
 * Pastel fills, anchor #2C2825 strokes for legibility.
 */
const A = '#2C2825'; // anchor outline
const CREAM = '#FFF9F4';
const APRICOT = '#FFDCC4';
const APRICOT_DEEP = '#F0C4A8';
const SAGE = '#C5DEB8';
const SAGE_DEEP = '#A8C99E';
const SAGE_MIST = '#E8F0E0';

export function HeroSplitIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 960 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Customer, handshake match, verified pro</title>

      {/* Left — Customer (apricot) */}
      <rect x="28" y="36" width="248" height="208" rx="22" fill={CREAM} stroke={A} strokeWidth="2.5" />
      <text x="48" y="58" fill={A} fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        Customer
      </text>
      {/* Bust */}
      <circle cx="120" cy="118" r="34" fill={APRICOT} stroke={A} strokeWidth="2.5" />
      <path
        d="M108 118c0-6 5-10 12-10s12 4 12 10"
        stroke={A}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M86 198c8-28 28-42 52-42h-4c24 0 44 14 52 42v12H86v-12z"
        fill={APRICOT_DEEP}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Request card */}
      <rect x="176" y="88" width="84" height="72" rx="10" fill="white" stroke={A} strokeWidth="2" />
      <rect x="188" y="102" width="60" height="5" rx="2" fill={APRICOT} opacity="0.85" />
      <rect x="188" y="114" width="48" height="4" rx="1" fill="#E8DFD6" />
      <rect x="188" y="124" width="52" height="4" rx="1" fill="#E8DFD6" />

      {/* Center — Interlocking handshake */}
      <rect x="308" y="28" width="344" height="224" rx="24" fill={CREAM} stroke={A} strokeWidth="2.5" />
      <text x="332" y="56" fill={A} fontSize="12" fontFamily="system-ui,sans-serif" fontWeight="700">
        Matched — handshake
      </text>
      {/* Two hands interlocking */}
      <path
        d="M380 168c12-24 32-36 52-32l8 20c-18 4-32 18-40 36l-20-24z"
        fill={APRICOT}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M580 168c-12-24-32-36-52-32l-8 20c18 4 32 18 40 36l20-24z"
        fill={SAGE}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M448 120c8 8 18 12 32 12s24-4 32-12"
        stroke={A}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="480" cy="152" r="6" fill={APRICOT_DEEP} stroke={A} strokeWidth="2" />
      <text x="360" y="220" fill={A} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600" opacity="0.85">
        ~10 min to a trusted yes
      </text>

      {/* Right — Verified Pro (sage) + shield */}
      <rect x="684" y="36" width="248" height="208" rx="22" fill={CREAM} stroke={A} strokeWidth="2.5" />
      <text x="704" y="58" fill={A} fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        Verified Pro
      </text>
      <circle cx="808" cy="112" r="36" fill={SAGE} stroke={A} strokeWidth="2.5" />
      {/* Smile */}
      <path
        d="M792 108c8 10 26 10 34 0"
        stroke={A}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="796" cy="100" rx="3" ry="3.5" fill={A} />
      <ellipse cx="820" cy="100" rx="3" ry="3.5" fill={A} />
      {/* Shoulders */}
      <path
        d="M748 206c10-32 32-48 60-48s50 16 60 48v10H748v-10z"
        fill={SAGE_MIST}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Shield on chest */}
      <path
        d="M788 154l20-8v28c0 14-20 24-20 24s-20-10-20-24v-28l20 8z"
        fill={SAGE_DEEP}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M798 168l6 6 12-14"
        stroke={A}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="728" y="228" width="160" height="26" rx="13" fill={SAGE_MIST} stroke={A} strokeWidth="2" />
      <text x="748" y="245" fill={A} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="700">
        Background-checked
      </text>
    </svg>
  );
}
