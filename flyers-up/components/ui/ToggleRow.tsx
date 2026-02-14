'use client';

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
  return (
    <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg bg-surface">
      <div className="min-w-0">
        <h3 className="font-medium text-text">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={switchAriaLabel ?? title}
      />
    </div>
  );
}

