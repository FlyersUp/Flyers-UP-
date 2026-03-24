/**
 * "Before" — neutral grey chaos: messy lines, overlapping chats, no-show.
 */
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
      {/* Shaky background lines */}
      <path
        d="M20 40c40 8 60-12 100 4s70-20 120 0 80-16 140 8"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M16 180c50-6 90 14 130-4s60 10 100-8 90 6 138-10"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M40 100l8-6 12 18-14 8 10 14"
        stroke="#94A3B8"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Messy chat bubbles */}
      <ellipse cx="100" cy="95" rx="52" ry="36" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
      <rect x="70" y="82" width="56" height="6" rx="2" fill="#CBD5E1" transform="rotate(-6 98 85)" />
      <rect x="74" y="94" width="44" height="5" rx="1" fill="#E2E8F0" transform="rotate(-4 96 96)" />

      <ellipse cx="220" cy="70" rx="48" ry="32" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" transform="rotate(8 220 70)" />
      <rect x="196" y="62" width="40" height="5" rx="1" fill="#CBD5E1" />
      <rect x="200" y="72" width="32" height="4" rx="1" fill="#F8FAFC" opacity="0.8" />

      <ellipse cx="280" cy="120" rx="56" ry="38" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" transform="rotate(-4 280 120)" />
      <rect x="248" y="108" width="48" height="6" rx="2" fill="#CBD5E1" />
      <rect x="252" y="120" width="36" height="5" rx="1" fill="#E2E8F0" />

      {/* No-show / ghost slot */}
      <circle cx="200" cy="165" r="36" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5 4" />
      <path
        d="M184 165l32 0M200 149v32"
        stroke="#94A3B8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="200" cy="165" r="24" stroke="#CBD5E1" strokeWidth="1.5" fill="none" opacity="0.6" />
      <text x="168" y="198" fill="#64748B" fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600">
        No confirmation
      </text>
    </svg>
  );
}
