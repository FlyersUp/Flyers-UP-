'use client';

import type { TabKey } from '@/components/profile/Tabs';

export function HighlightsRow({
  items,
  active,
  onSelect,
}: {
  items: Array<{ key: TabKey; label: string; icon: string }>;
  active: TabKey;
  onSelect: (k: TabKey) => void;
}) {
  return (
    <div className="-mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
        {items.map((it) => {
          const isOn = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onSelect(it.key)}
              className={[
                'shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold',
                'border transition-shadow',
                isOn ? 'border-accent/60 shadow-sm' : 'border-hairline hover:shadow-sm',
                'bg-white',
              ].join(' ')}
            >
              <span aria-hidden className={isOn ? 'text-accent' : 'text-muted'}>
                {it.icon}
              </span>
              <span className={isOn ? 'text-text' : 'text-text'}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

