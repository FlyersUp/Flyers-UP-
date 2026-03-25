/**
 * After: mirrors Before — same frame & customer anchor; structured booking + thread + verified pro.
 * Flat editorial, anchor stroke, soft pastels (illustrationTokens).
 */
import { L, BA } from './illustrationTokens';
import { CustomerMini } from './illustrationPrimitives';

export function AfterClarityIllustration({ className = '' }: { className?: string }) {
  const A = L.outline;
  const { frameX, frameY, frameW, frameH, frameRx } = BA;
  const capY = 204;
  const capX = 200;

  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Documented booking and verified pro</title>
      <rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        rx={frameRx}
        fill={L.cream}
        stroke={A}
        strokeWidth={L.stroke}
      />

      <CustomerMini cx={56} cy={88} />

      {/* Thread spine — order vs scattered */}
      <line x1={96} y1={52} x2={96} y2={168} stroke={L.greyLine} strokeWidth={2} strokeLinecap="round" />

      {/* Booking / agreement record — focal */}
      <rect x={112} y={40} width={168} height={74} rx={12} fill={L.white} stroke={A} strokeWidth={L.strokeInner} />
      <rect x={122} y={46} width={148} height={22} rx={8} fill={L.apricotSoft} stroke={A} strokeWidth={1.5} />
      <text x={132} y={61} fill={A} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">
        Booking #1042
      </text>
      <rect x={124} y={74} width={100} height={4} rx={1} fill={L.sandMuted} />
      <rect x={124} y={84} width={84} height={4} rx={1} fill={L.sandMuted} />
      <rect x={124} y={94} width={92} height={4} rx={1} fill={L.sandMuted} />
      <circle cx={258} cy={98} r={12} fill={L.sage} stroke={A} strokeWidth={2} />
      <path d="M252 98l4 4 8-9" stroke={A} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Aligned message cues — same vertical lane as chaos bubbles */}
      <rect x={112} y={126} width={140} height={20} rx={10} fill={L.sand} stroke={A} strokeWidth={L.strokeInner} />
      <rect x={124} y={134} width={72} height={3} rx={1} fill={L.sandMuted} />
      <rect x={112} y={150} width={140} height={20} rx={10} fill={L.sand} stroke={A} strokeWidth={L.strokeInner} />
      <rect x={124} y={158} width={56} height={3} rx={1} fill={L.sandMuted} />

      {/* Verified pro — same quadrant as “noise” in Before */}
      <g transform="translate(268, 44)">
        <circle cx="22" cy="22" r="18" fill={L.sage} stroke={A} strokeWidth={L.strokeInner} />
        <path d="M12 20c6 8 20 8 26 0" stroke={A} strokeWidth={1.8} strokeLinecap="round" />
        <ellipse cx="16" cy="16" rx="2.5" ry="3" fill={A} />
        <ellipse cx="28" cy="16" rx="2.5" ry="3" fill={A} />
        <path
          d="M4 72c6-16 18-24 34-24s28 8 34 24v6H4V72z"
          fill={L.sageSoft}
          stroke={A}
          strokeWidth={L.strokeInner}
          strokeLinejoin="round"
        />
        <path
          d="M14 48l12-5v18c0 8-12 14-12 14s-12-6-12-14V43l12 5z"
          fill={L.sageDeep}
          stroke={A}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path d="M20 52l4 4 8-9" stroke={A} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Schedule cue */}
      <rect x={268} y={118} width={44} height={40} rx={8} fill={L.white} stroke={A} strokeWidth={L.strokeInner} />
      <rect x={276} y={126} width={28} height={8} rx={2} fill={L.apricotSoft} stroke={A} strokeWidth={1.25} />
      <path d="M276 140h28M276 146h20M284 152h12" stroke={A} strokeWidth={1.5} strokeLinecap="round" opacity={0.45} />

      <text
        x={capX}
        y={capY}
        textAnchor="middle"
        fill={L.textMuted}
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
      >
        One thread, one record, one verified pro
      </text>
    </svg>
  );
}
