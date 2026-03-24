/**
 * After: sage + apricot pastels, smiling verified pro + shield, single agreement document.
 * Anchor #2C2825 strokes.
 */
const A = '#2C2825';
const SAGE = '#C5DEB8';
const SAGE_SOFT = '#E4ECD9';
const SAGE_DEEP = '#8FAD84';
const APRICOT = '#FFDCC4';
const APRICOT_DOC = '#F8E8D8';
const APRICOT_ACCENT = '#F0C4A8';
const WHITE = '#FFFCFA';

export function AfterClarityIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Clarity after</title>
      <rect width="400" height="220" rx="16" fill={SAGE_SOFT} />

      {/* Agreement document — apricot accent */}
      <rect x="40" y="48" width="132" height="148" rx="14" fill={WHITE} stroke={A} strokeWidth="2.5" />
      <rect x="40" y="48" width="132" height="36" rx="14" fill={APRICOT_ACCENT} stroke={A} strokeWidth="2" />
      <text x="58" y="72" fill={A} fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        Agreement
      </text>
      <rect x="56" y="98" width="100" height="6" rx="2" fill={APRICOT_DOC} stroke={A} strokeWidth="1.25" />
      <rect x="56" y="112" width="88" height="5" rx="1" fill="#E8DFD6" />
      <rect x="56" y="124" width="92" height="5" rx="1" fill="#E8DFD6" />
      <rect x="56" y="136" width="72" height="5" rx="1" fill="#E8DFD6" />
      <circle cx="106" cy="168" r="14" fill={APRICOT} stroke={A} strokeWidth="2" />
      <path d="M100 168l4 4 8-10" stroke={A} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />

      {/* Verified pro — smiling + sage shield */}
      <circle cx="290" cy="96" r="38" fill={SAGE} stroke={A} strokeWidth="2.5" />
      <path d="M274 94c10 12 32 12 42 0" stroke={A} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="278" cy="86" rx="3.5" ry="4" fill={A} />
      <ellipse cx="302" cy="86" rx="3.5" ry="4" fill={A} />
      <path
        d="M252 188c12-36 38-54 70-54s58 18 70 54v14H252v-14z"
        fill={WHITE}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M278 128l24-10v34c0 16-24 28-24 28s-24-12-24-28v-34l24 10z"
        fill={SAGE_DEEP}
        stroke={A}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M290 142l8 8 16-18" stroke={A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <text x="40" y="212" fill={A} fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600" opacity="0.9">
        One pro, one paper trail, one clear yes
      </text>
    </svg>
  );
}
