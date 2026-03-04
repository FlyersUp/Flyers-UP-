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
    <div className="flex min-h-[56px] items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-default">
          <span className="text-sm font-medium text-text">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-black/60">{description}</span>}
        </label>
      </div>
      <div className="flex h-10 shrink-0 items-center">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="min-w-[120px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-text focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
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
