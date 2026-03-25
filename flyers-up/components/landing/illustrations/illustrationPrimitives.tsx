/**
 * Shared SVG building blocks for landing illustrations (identical anchors across panels).
 */
import { L } from './illustrationTokens';

/** Front-facing customer bust; position by passing scene coordinates (head center). */
export function CustomerMini({ cx, cy }: { cx: number; cy: number }) {
  const A = L.outline;
  return (
    <g transform={`translate(${cx - 48}, ${cy - 82})`}>
      <circle cx="48" cy="24" r="16" fill={L.apricot} stroke={A} strokeWidth={L.stroke} />
      <path d="M36 22c0-5 6-9 12-9s12 4 12 9" stroke={A} strokeWidth={2} strokeLinecap="round" />
      <path
        d="M28 72c8-18 22-28 40-28s32 10 40 28v8H28V72z"
        fill={L.apricotDeep}
        stroke={A}
        strokeWidth={L.stroke}
        strokeLinejoin="round"
      />
    </g>
  );
}
