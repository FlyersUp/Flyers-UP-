'use client';

import { useId } from 'react';
import { Switch } from '@/components/ui/Switch';

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  switchAriaLabel,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  switchAriaLabel?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-default">
          <span className="text-sm font-medium text-text">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-black/60">{description}</span>}
        </label>
      </div>
      <div className="flex h-10 shrink-0 items-center">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={switchAriaLabel ?? title}
        />
      </div>
    </div>
  );
}

