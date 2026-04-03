'use client';

import { useId } from 'react';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
};

const TRACK_W = 'w-12'; /* 48px */
const THUMB = 'h-6 w-6'; /* 24px */
/* Track 48px wide, thumb 24px, 3px inset → thumb left 3px off, 21px on */
const THUMB_POS_OFF = 'left-[3px]';
const THUMB_POS_ON = 'left-[21px]';

/**
 * App-wide switch: high-contrast OFF (muted track + strong border), success-green ON,
 * white elevated thumb, 44px min touch target, keyboard + focus styles.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: SwitchProps) {
  const autoId = useId();
  const resolvedId = id ?? `switch-${autoId}`;

  const trackBase = `relative inline-flex h-7 ${TRACK_W} shrink-0 rounded-full border-2 transition-colors duration-200 ease-out`;
  const trackOff =
    'border-borderStrong bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]';
  const trackOn = 'border-success/70 bg-success shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]';
  const trackDisabled = 'border-border bg-surface2 opacity-60';

  const thumbBase = `${THUMB} pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.14),0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06] transition-[left] duration-200 ease-out dark:ring-white/10`;

  const focus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  const trackClass = [
    trackBase,
    disabled ? trackDisabled : checked ? trackOn : trackOff,
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={resolvedId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={[
        'inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent',
        focus,
        disabled ? 'cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={trackClass}>
        <span
          className={`${thumbBase} ${checked ? THUMB_POS_ON : THUMB_POS_OFF}`}
          aria-hidden
        />
      </span>
    </button>
  );
}
