/**
 * Hero split-view: customer request | digital contract bridge | verified pro.
 * Flat 2.0 style — brand blue + white, rounded shapes.
 */
export function HeroSplitIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 960 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Request, match in minutes, verified pro</title>
      {/* Left — Customer + request */}
      <rect x="32" y="40" width="240" height="200" rx="20" fill="#F8FAFC" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="100" cy="100" r="28" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
      <path
        d="M92 96h16M92 104h12"
        stroke="#1E40AF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="150" y="78" width="100" height="8" rx="2" fill="#CBD5E1" />
      <rect x="150" y="94" width="88" height="8" rx="2" fill="#E2E8F0" />
      <rect x="150" y="110" width="92" height="8" rx="2" fill="#E2E8F0" />
      <rect x="56" y="150" width="192" height="64" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="72" y="168" width="120" height="6" rx="2" fill="#94A3B8" opacity="0.5" />
      <rect x="72" y="182" width="160" height="6" rx="2" fill="#CBD5E1" />
      <rect x="72" y="196" width="100" height="6" rx="2" fill="#CBD5E1" />
      <text x="56" y="34" fill="#64748B" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="600">
        Request
      </text>

      {/* Center — Digital contract + 10 min */}
      <rect x="360" y="32" width="240" height="216" rx="22" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
      <rect x="388" y="64" width="184" height="10" rx="3" fill="#BFDBFE" />
      <rect x="388" y="84" width="160" height="8" rx="2" fill="#E2E8F0" />
      <rect x="388" y="100" width="170" height="8" rx="2" fill="#E2E8F0" />
      <rect x="388" y="116" width="140" height="8" rx="2" fill="#E2E8F0" />
      {/* Doc / contract glyph */}
      <rect x="420" y="144" width="120" height="72" rx="8" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
      <path d="M440 168h80M440 184h64M440 200h72" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="480" cy="158" r="10" fill="#3B82F6" />
      <path d="M476 158l4 4 8-10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="400" y="228" width="160" height="28" rx="14" fill="#2563EB" />
      <text x="420" y="246" fill="white" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="700">
        ~10 min match
      </text>
      <text x="388" y="52" fill="#1E3A8A" fontSize="12" fontFamily="system-ui,sans-serif" fontWeight="700">
        Digital agreement
      </text>

      {/* Connectors */}
      <path
        d="M272 140h72"
        stroke="#93C5FD"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 8"
      />
      <path
        d="M688 140h72"
        stroke="#93C5FD"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 8"
      />

      {/* Right — Verified Pro */}
      <rect x="688" y="40" width="240" height="200" rx="20" fill="#F8FAFC" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="808" cy="100" r="32" fill="#D1FAE5" stroke="#10B981" strokeWidth="2.5" />
      <path d="M798 100l6 6 14-16" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="748" y="148" width="120" height="10" rx="3" fill="#10B981" opacity="0.25" />
      <rect x="748" y="168" width="100" height="8" rx="2" fill="#CBD5E1" />
      <rect x="748" y="184" width="110" height="8" rx="2" fill="#CBD5E1" />
      <rect x="720" y="208" width="176" height="28" rx="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
      <path
        d="M736 222l6 5 10-12"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="752" y="226" fill="#047857" fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="700">
        Verified Pro
      </text>
      <text x="720" y="34" fill="#64748B" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="600">
        Accepts
      </text>
    </svg>
  );
}
