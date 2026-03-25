/**
 * Hero triptych: Customer → Matched (two profile cards + connector + check) → Verified Pro.
 * Unified stroke, pastel fills, equal panels (illustrationTokens).
 */
import { L, HERO as H } from './illustrationTokens';

export function HeroSplitIllustration({ className = '' }: { className?: string }) {
  const A = L.outline;
  const { panelW, panelH, y, x1, x2, x3 } = H;
  const cx1 = x1 + panelW / 2;
  const cx2 = x2 + panelW / 2;
  const cx3 = x3 + panelW / 2;
  const midY = 118;

  return (
    <svg
      className={className}
      viewBox="0 0 960 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Customer, matched profiles, verified pro</title>

      {/* ——— Panel 1: Customer ——— */}
      <rect x={x1} y={y} width={panelW} height={panelH} rx={L.panelRx} fill={L.cream} stroke={A} strokeWidth={L.stroke} />
      <text
        x={x1 + 20}
        y={y + 26}
        fill={A}
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        Customer
      </text>
      <g transform={`translate(${cx1 - 120}, ${y + 44})`}>
        <circle cx="120" cy="52" r="30" fill={L.apricot} stroke={A} strokeWidth={L.stroke} />
        <path
          d="M108 50c0-5 5-9 12-9s12 4 12 9"
          stroke={A}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M86 128c10-24 30-36 54-36h-4c24 0 44 12 54 36v10H86v-10z"
          fill={L.apricotDeep}
          stroke={A}
          strokeWidth={L.stroke}
          strokeLinejoin="round"
        />
        <rect x="152" y="58" width="72" height="58" rx={10} fill={L.white} stroke={A} strokeWidth={L.strokeInner} />
        <rect x="162" y="70" width="52" height="5" rx={2} fill={L.apricotSoft} />
        <rect x="162" y="82" width="40" height="4" rx={1} fill={L.sandMuted} />
        <rect x="162" y="92" width="44" height="4" rx={1} fill={L.sandMuted} />
      </g>
      <text
        x={cx1}
        y={y + panelH - 14}
        textAnchor="middle"
        fill={L.textMuted}
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
      >
        Your request, clear &amp; ready
      </text>

      {/* ——— Panel 2: Matched ——— */}
      <rect x={x2} y={y} width={panelW} height={panelH} rx={L.panelRx} fill={L.cream} stroke={A} strokeWidth={L.stroke} />
      <text
        x={x2 + 20}
        y={y + 26}
        fill={A}
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        Matched
      </text>
      {/* Customer mini card */}
      <rect x={x2 + 28} y={y + 52} width={78} height={102} rx={12} fill={L.white} stroke={A} strokeWidth={L.strokeInner} />
      <circle cx={x2 + 67} cy={y + 82} r={14} fill={L.apricot} stroke={A} strokeWidth={2} />
      <rect x={x2 + 40} y={y + 100} width={54} height={4} rx={1} fill={L.sandMuted} />
      <rect x={x2 + 40} y={y + 110} width={40} height={4} rx={1} fill={L.sandMuted} />
      <text x={x2 + 67} y={y + 132} textAnchor="middle" fill={A} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">
        You
      </text>
      {/* Connectors: profile cards → match badge → pro card */}
      <line
        x1={x2 + 106}
        y1={midY}
        x2={cx2 - 22}
        y2={midY}
        stroke={A}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Center verified match badge */}
      <circle cx={cx2} cy={midY} r={22} fill={L.sage} stroke={A} strokeWidth={L.stroke} />
      <path
        d={`M${cx2 - 8} ${midY} l5 5 12-14`}
        stroke={A}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={cx2 + 22}
        y1={midY}
        x2={x2 + 206}
        y2={midY}
        stroke={A}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Pro mini card */}
      <rect x={x2 + 206} y={y + 52} width={78} height={102} rx={12} fill={L.white} stroke={A} strokeWidth={L.strokeInner} />
      <circle cx={x2 + 245} cy={y + 82} r={14} fill={L.sage} stroke={A} strokeWidth={2} />
      <rect x={x2 + 218} y={y + 100} width={54} height={4} rx={1} fill={L.sageSoft} />
      <rect x={x2 + 218} y={y + 110} width={36} height={4} rx={1} fill={L.sandMuted} />
      <rect x={x2 + 258} y={y + 58} width={20} height={14} rx={3} fill={L.sageDeep} stroke={A} strokeWidth={1.5} />
      <path d={`M${x2 + 264} ${y + 64} l3 3 5-6`} stroke={L.white} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <text x={x2 + 245} y={y + 132} textAnchor="middle" fill={A} fontSize="8" fontWeight="700" fontFamily="system-ui,sans-serif">
        Pro
      </text>
      <text
        x={cx2}
        y={y + panelH - 14}
        textAnchor="middle"
        fill={L.textMuted}
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
      >
        ~10 min to a trusted yes
      </text>

      {/* ——— Panel 3: Verified Pro ——— */}
      <rect x={x3} y={y} width={panelW} height={panelH} rx={L.panelRx} fill={L.cream} stroke={A} strokeWidth={L.stroke} />
      <text
        x={x3 + 20}
        y={y + 26}
        fill={A}
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        Verified Pro
      </text>
      <g transform={`translate(${cx3 - 120}, ${y + 44})`}>
        <circle cx="120" cy="52" r="32" fill={L.sage} stroke={A} strokeWidth={L.stroke} />
        <path d="M104 50c8 10 26 10 34 0" stroke={A} strokeWidth={2.2} strokeLinecap="round" />
        <ellipse cx="108" cy="44" rx="3" ry="3.5" fill={A} />
        <ellipse cx="132" cy="44" rx="3" ry="3.5" fill={A} />
        <path
          d="M76 128c10-26 32-40 58-40h12c26 0 48 14 58 40v10H76v-10z"
          fill={L.sageSoft}
          stroke={A}
          strokeWidth={L.stroke}
          strokeLinejoin="round"
        />
        <path
          d="M108 88l24-9v32c0 14-24 24-24 24s-24-10-24-24V79l24 9z"
          fill={L.sageDeep}
          stroke={A}
          strokeWidth={L.stroke}
          strokeLinejoin="round"
        />
        <path d="M118 98l6 6 12-14" stroke={A} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect
        x={cx3 - 78}
        y={y + 176}
        width={156}
        height={26}
        rx={13}
        fill={L.sageSoft}
        stroke={A}
        strokeWidth={L.strokeInner}
      />
      <text
        x={cx3}
        y={y + 193}
        textAnchor="middle"
        fill={A}
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
      >
        Background-checked
      </text>
    </svg>
  );
}
