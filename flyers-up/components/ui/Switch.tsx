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
 * Centered switch with subtle theme tints.
 * Track: h-6 w-11. Thumb: h-5 w-5. Unchecked: translate-x-1, checked: translate-x-5.
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
    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200';
  const trackInactive = 'bg-black/10 border border-black/10';
  const trackActive = 'bg-accent/80 border border-accent/60';
  const trackDisabled = 'bg-black/5 border border-black/5 opacity-70 cursor-not-allowed';

  const thumbBase =
    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200';
  const thumbOn = 'translate-x-[22px]';
  const thumbOff = 'translate-x-1';

  const focus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F6]';

  const trackClass = [
    trackBase,
    focus,
    disabled ? trackDisabled : checked ? trackActive : trackInactive,
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
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={trackClass}
    >
      <span className={`${thumbBase} ${checked ? thumbOn : thumbOff}`} aria-hidden />
    </button>
  );
}

