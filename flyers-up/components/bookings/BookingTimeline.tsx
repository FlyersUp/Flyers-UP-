'use client';

import { Check } from 'lucide-react';
import {
  type Status,
  STATUS_ORDER,
  STATUS_LABELS,
  getStageState,
} from '@/components/jobs/jobStatus';
import { DEFAULT_BOOKING_TIMEZONE, formatTimelineTimestampInZone } from '@/lib/datetime';

const GREEN = '#B2FBA5';
const ORANGE = '#FFC067';
const CUSTOMER_BLUE = '#4A69BD';

export interface BookingTimelineProps {
  status: Status;
  /** IANA zone for timeline stamps; avoids SSR/client toLocaleString mismatches. */
  timeZone?: string;
  /** Customer booking detail: blue emphasis to match step tracker. */
  tone?: 'default' | 'customer';
  timestamps: Partial<Record<Status, string>> & {
    booked?: string;
    awaitingAcceptance?: string;
    accepted?: string;
    onTheWay?: string;
    arrived?: string;
    started?: string;
    completed?: string;
    paid?: string;
  };
  compact?: boolean;
}

export function BookingTimeline({
  status,
  timestamps,
  compact = false,
  timeZone = DEFAULT_BOOKING_TIMEZONE,
  tone = 'default',
}: BookingTimelineProps) {
  const tsMap: Partial<Record<Status, string>> = {
    BOOKED: timestamps.booked ?? timestamps.BOOKED,
    AWAITING_ACCEPTANCE: timestamps.awaitingAcceptance ?? timestamps.AWAITING_ACCEPTANCE,
    ACCEPTED: timestamps.accepted ?? timestamps.ACCEPTED,
    ON_THE_WAY: timestamps.onTheWay ?? timestamps.ON_THE_WAY,
    ARRIVED: timestamps.arrived ?? timestamps.ARRIVED,
    IN_PROGRESS: timestamps.started ?? timestamps.IN_PROGRESS,
    COMPLETED: timestamps.completed ?? timestamps.COMPLETED,
    PAID: timestamps.paid ?? timestamps.PAID,
  };

  return (
    <ol
      className="relative space-y-0"
      role="list"
      aria-label="Booking status timeline"
    >
      {STATUS_ORDER.map((stage, idx) => {
        const state = getStageState(status, stage);
        const ts = tsMap[stage];
        const isLast = idx === STATUS_ORDER.length - 1;

        const dotStyle =
          tone === 'customer'
            ? state === 'done'
              ? {
                  backgroundColor: CUSTOMER_BLUE,
                  color: '#ffffff',
                }
              : state === 'active'
                ? {
                    backgroundColor: CUSTOMER_BLUE,
                    boxShadow: `0 0 0 4px ${CUSTOMER_BLUE}33`,
                    color: '#ffffff',
                  }
                : {
                    backgroundColor: 'transparent',
                    border: '2px solid hsl(var(--border))',
                    color: 'transparent',
                  }
            : state === 'done'
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
                  };

        const connectorColor =
          tone === 'customer'
            ? state === 'done'
              ? `${CUSTOMER_BLUE}55`
              : 'hsl(var(--border) / 0.6)'
            : state === 'done'
              ? `${GREEN}66`
              : 'hsl(var(--border) / 0.6)';

        return (
          <li
            key={stage}
            className={`relative flex gap-4 ${compact ? 'pb-4 last:pb-0' : 'pb-6 last:pb-0'}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <div className="relative flex flex-col items-center shrink-0 w-6">
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
              {!isLast && (
                <div
                  className="absolute left-1/2 top-6 -translate-x-1/2 w-0.5 bottom-0"
                  style={{
                    backgroundColor: connectorColor,
                  }}
                />
              )}
            </div>

            <div className={`flex-1 min-w-0 pt-0.5 ${compact ? '' : ''}`}>
              <div
                className={
                  state === 'upcoming'
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-gray-100'
                }
              >
                <span className={`font-medium ${compact ? 'text-sm' : 'text-sm'}`}>
                  {STATUS_LABELS[stage]}
                </span>
                {ts && (
                  <span className="ml-2 text-xs opacity-80">
                    {formatTimelineTimestampInZone(ts, timeZone)}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
