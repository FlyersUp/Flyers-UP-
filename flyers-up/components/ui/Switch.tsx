'use client';

import { useId } from 'react';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
};

/**
 * Role-aware switch:
 * - Uses `bg-accent` for the active track (accent is set by `.theme-customer` / `.theme-pro`).
 * - Keeps inactive + disabled states neutral.
 * - Focus ring stays subtle/neutral.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const autoId = useId();
  const resolvedId = id ?? `switch-${autoId}`;

  const trackBase =
    'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200';
  const trackInactive = 'bg-surface2 border-[var(--hairline)]';
  const trackActive = 'bg-[hsl(var(--switch-accent,var(--accent)))] border-[hsl(var(--switch-accent,var(--accent)))] shadow-[0_0_0_1px_hsl(var(--switch-accent,var(--accent)))] hover:brightness-110';
  const trackDisabled = 'bg-surface2 border-[var(--hairline)] opacity-70 cursor-not-allowed';

  const thumbBase =
    'inline-block h-5 w-5 transform rounded-full transition-transform duration-200 shadow-md';
  const thumbOn = 'translate-x-[20px] bg-white';
  const thumbOff = 'translate-x-[2px]';
  const thumbEnabled = 'bg-surface';
  const thumbDisabled = 'bg-surface2';

  const focus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  const trackClass = [
    trackBase,
    focus,
    disabled ? trackDisabled : checked ? trackActive : trackInactive,
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const thumbClass = [
    thumbBase,
    checked ? thumbOn : thumbOff,
    disabled ? thumbDisabled : thumbEnabled,
  ].join(' ');

  return (
    <button
      id={resolvedId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={trackClass}
    >
      <span className={thumbClass} aria-hidden />
    </button>
  );
}

