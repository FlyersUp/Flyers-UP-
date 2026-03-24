/**
 * "After" — success green clarity: calendar, clean thread, verified badge.
 */
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
      {/* Clean grid lines */}
      <path d="M32 48h336M32 88h336M32 128h336" stroke="#D1FAE5" strokeWidth="1" opacity="0.9" />
      <path d="M120 32v160M200 32v160M280 32v160" stroke="#ECFDF5" strokeWidth="1" />

      {/* Calendar block */}
      <rect x="48" y="56" width="120" height="100" rx="12" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
      <rect x="48" y="56" width="120" height="28" rx="12" fill="#10B981" />
      <text x="72" y="76" fill="white" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        Scheduled
      </text>
      <rect x="64" y="96" width="24" height="20" rx="4" fill="#D1FAE5" />
      <rect x="96" y="96" width="24" height="20" rx="4" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
      <rect x="128" y="96" width="24" height="20" rx="4" fill="#D1FAE5" />
      <rect x="64" y="124" width="24" height="20" rx="4" fill="#ECFDF5" />
      <rect x="96" y="124" width="24" height="20" rx="4" fill="#10B981" opacity="0.35" />
      <path d="M102 132l4 4 8-8" stroke="#059669" strokeWidth="2" strokeLinecap="round" />

      {/* Single clean message thread */}
      <rect x="200" y="64" width="152" height="44" rx="12" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="1.5" />
      <rect x="216" y="80" width="100" height="6" rx="2" fill="#BBF7D0" />
      <rect x="216" y="92" width="72" height="5" rx="2" fill="#D1FAE5" />
      <circle cx="332" cy="86" r="14" fill="#10B981" />
      <path d="M326 86l4 4 8-10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Verified badge */}
      <rect x="216" y="130" width="136" height="40" rx="12" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
      <circle cx="240" cy="150" r="14" fill="#D1FAE5" stroke="#059669" strokeWidth="1.5" />
      <path d="M234 150l4 4 10-12" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="260" y="155" fill="#047857" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        Verified
      </text>

      <text x="48" y="210" fill="#059669" fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="600" opacity="0.85">
        One thread · clear time · documented
      </text>
    </svg>
  );
}
