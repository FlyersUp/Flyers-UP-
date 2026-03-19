'use client';

import { useId } from 'react';

export function SettingsSelectRow<T extends string>({
  title,
  description,
  value,
  options,
  onChange,
  id: idProp,
}: {
  title: string;
  description?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  id?: string;
}) {
  const autoId = useId();
  const id = idProp ?? `select-${autoId}`;

  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 rounded-xl border border-border bg-surface2/60 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-default">
          <span className="text-sm font-medium text-text">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-text3">{description}</span>}
        </label>
      </div>
      <div className="flex h-10 shrink-0 items-center">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="min-w-[120px] rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text shadow-[var(--shadow-1)] focus:border-borderStrong focus:outline-none focus:ring-2 focus:ring-[var(--ring-green)]"
          aria-label={title}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
