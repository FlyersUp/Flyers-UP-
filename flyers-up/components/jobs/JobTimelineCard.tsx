'use client';

/**
 * JobTimelineCard – Operational Timeline Card for Pro job status.
 *
 * STAGE STATE MAPPING:
 * getStageState(currentStatus, stage) returns "done" | "active" | "upcoming".
 * - done: stage index < current index → green dot + check
 * - active: stage index === current index → orange dot + pulse
 * - upcoming: stage index > current index → outline dot
 *
 * INTEGRATION:
 * - status: Map from your DB (e.g. booking.status) to our Status union in the page layer.
 * - timestamps: Pass { [status]: "2024-01-15T10:30:00Z" } or pre-formatted strings from statusHistory.
 * - etaText: For ON_THE_WAY only; e.g. "Arriving in ~15 min".
 * - onShareLocation / onAddPhoto: Wire to your handlers; buttons disable gracefully if undefined.
 */

import { Check } from 'lucide-react';
import {
  type Status,
  STATUS_ORDER,
  STATUS_LABELS,
  getStageState,
} from './jobStatus';

const GREEN = '#B2FBA5';
const ORANGE = '#FFC067';

export interface JobTimelineCardProps {
  status: Status;
  timestamps?: Partial<Record<Status, string>>;
  etaText?: string;
  onShareLocation?: () => void;
  onAddPhoto?: () => void;
  className?: string;
}

function formatTimestamp(raw: string): string {
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default function JobTimelineCard({
  status,
  timestamps = {},
  etaText,
  onShareLocation,
  onAddPhoto,
  className = '',
}: JobTimelineCardProps) {
  const currentLabel = STATUS_LABELS[status];
  const isCompleted = status === 'COMPLETED';
  const isActive = !isCompleted;

  return (
    <div
      className={`rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] shadow-[var(--shadow-card)] p-6 ${className}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[hsl(var(--text))]">
          Job timeline
        </h2>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: isCompleted ? GREEN : isActive ? ORANGE : 'hsl(var(--muted))',
            color: isCompleted || isActive ? 'hsl(var(--text))' : 'hsl(var(--text-3))',
          }}
        >
          {currentLabel}
        </span>
      </div>

      {/* Vertical timeline */}
      <ol className="relative space-y-0" role="list" aria-label="Job status timeline">
        {STATUS_ORDER.map((stage, idx) => {
          const state = getStageState(status, stage);
          const ts = timestamps[stage];
          const isLast = idx === STATUS_ORDER.length - 1;

          return (
            <li
              key={stage}
              className="relative flex gap-4 pb-6 last:pb-0"
              aria-current={state === 'active' ? 'step' : undefined}
            >
              {/* Left: dot + connector rail */}
              <div className="relative flex flex-col items-center shrink-0 w-6">
                {/* Dot */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center w-6 h-6 rounded-full shrink-0
                    transition-all duration-200
                    ${state === 'active' ? 'animate-timeline-pulse' : ''}
                  `}
                  style={
                    state === 'done'
                      ? {
                          backgroundColor: GREEN,
                          color: 'hsl(var(--text))',
                        }
                      : state === 'active'
                        ? {
                            backgroundColor: ORANGE,
                            boxShadow: `0 0 0 4px ${ORANGE}40`,
                            color: 'hsl(var(--text))',
                          }
                        : {
                            backgroundColor: 'transparent',
                            border: '2px solid hsl(var(--border))',
                            color: 'transparent',
                          }
                  }
                >
                  {state === 'done' && (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  )}
                </div>
                {/* Connector line (below dot to next row) */}
                {!isLast && (
                  <div
                    className="absolute left-1/2 top-6 -translate-x-1/2 w-0.5 bottom-0"
                    style={{
                      backgroundColor:
                        state === 'done'
                          ? `${GREEN}66`
                          : 'hsl(var(--border) / 0.6)',
                    }}
                  />
                )}
              </div>

              {/* Right: content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={
                    state === 'upcoming'
                      ? 'text-[hsl(var(--text-3))]'
                      : 'text-[hsl(var(--text))]'
                  }
                >
                  <span className="font-medium text-sm">
                    {STATUS_LABELS[stage]}
                  </span>
                  {ts && (
                    <span className="ml-2 text-xs opacity-80">
                      {formatTimestamp(ts)}
                    </span>
                  )}
                </div>

                {/* Detail line / micro-actions */}
                <div className="mt-1.5 space-y-1">
                  {stage === 'ON_THE_WAY' && state === 'active' && (
                    <>
                      {etaText && (
                        <p className="text-xs text-[hsl(var(--text-3))]">
                          {etaText}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={onShareLocation}
                        disabled={!onShareLocation}
                        className={`
                          text-xs font-medium
                          ${onShareLocation ? 'hover:text-[#FFC067] focus-visible:ring-2 focus-visible:ring-[#FFC067] focus-visible:ring-offset-1 rounded' : 'opacity-60 cursor-not-allowed'}
                          text-[hsl(var(--text-2))] transition-colors outline-none
                        `}
                      >
                        Share live location
                      </button>
                    </>
                  )}
                  {stage === 'IN_PROGRESS' && state === 'active' && (
                    <button
                      type="button"
                      onClick={onAddPhoto}
                      disabled={!onAddPhoto}
                      className={`
                        text-xs font-medium
                        ${onAddPhoto ? 'hover:text-[#FFC067] focus-visible:ring-2 focus-visible:ring-[#FFC067] focus-visible:ring-offset-1 rounded' : 'opacity-60 cursor-not-allowed'}
                        text-[hsl(var(--text-2))] transition-colors outline-none
                      `}
                    >
                      Add before/after photo
                    </button>
                  )}
                  {stage === 'COMPLETED' && state === 'done' && (
                    <p className="text-xs text-[hsl(var(--text-3))]">
                      Payment released
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
