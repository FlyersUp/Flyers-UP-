/**
 * Before: same artboard as After — customer left, scattered thread bubbles, no clear record.
 * Flat editorial, anchor stroke, soft pastels (illustrationTokens).
 */
import { L, BA } from './illustrationTokens';
import { CustomerMini } from './illustrationPrimitives';

function Bubble({
  x,
  y,
  w,
  h,
  rot,
  fill,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  fill: string;
}) {
  const A = L.outline;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={A} strokeWidth={L.strokeInner} />
      <rect x={x + 12} y={y + 12} width={w * 0.55} height={4} rx={1} fill={L.sandMuted} />
      <rect x={x + 12} y={y + 22} width={w * 0.4} height={3} rx={1} fill={L.greyLine} />
    </g>
  );
}

export function BeforeChaosIllustration({ className = '' }: { className?: string }) {
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
      <title>Chaotic messages with no clear record</title>
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

      {/* Scattered message bubbles — same rough bounding box as After “story” panel */}
      <Bubble x={108} y={38} w={76} h={42} rot={-7} fill={L.sand} />
      <Bubble x={192} y={32} w={72} h={38} rot={9} fill={L.apricotSoft} />
      <Bubble x={268} y={48} w={68} h={44} rot={-5} fill={L.sand} />
      <Bubble x={128} y={96} w={80} h={40} rot={6} fill={L.apricotSoft} />
      <Bubble x={214} y={108} w={74} h={36} rot={-11} fill={L.sandMuted} />
      {/* Ambiguity: ellipsis / no thread */}
      <text x={248} y={92} fill={L.greyLine} fontSize="22" fontWeight="700" fontFamily="system-ui,sans-serif">
        ···
      </text>

      {/* No single record */}
      <rect
        x={168}
        y={152}
        width={164}
        height={48}
        rx={10}
        fill={L.creamDeep}
        stroke={A}
        strokeWidth={L.strokeInner}
        strokeDasharray="6 5"
      />
      <text x={250} y={182} textAnchor="middle" fill={L.textMuted} fontSize="10" fontWeight="700" fontFamily="system-ui,sans-serif">
        No one record
      </text>

      <text
        x={capX}
        y={capY}
        textAnchor="middle"
        fill={L.textMuted}
        fontSize="10"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
      >
        Who&apos;s actually showing up?
      </text>
    </svg>
  );
}
