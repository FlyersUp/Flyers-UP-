'use client';

export type TabKey = 'work' | 'services' | 'reviews' | 'about';

export type TabDef = {
  key: TabKey;
  label: string;
  icon: string;
};

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-1.5 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between gap-1.5">
        {tabs.map((t) => {
          const isOn = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={[
                'relative flex-1 rounded-xl px-2 py-2.5 text-xs font-medium tracking-wide',
                'transition-colors',
                isOn
                  ? 'bg-[hsl(var(--accent-customer)/0.2)] text-text'
                  : 'text-text3 hover:text-text hover:bg-hover/70',
              ].join(' ')}
              aria-current={isOn ? 'page' : undefined}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span aria-hidden>{t.icon}</span>
                <span>{t.label}</span>
              </span>
              {isOn ? (
                <span
                  className="absolute bottom-0 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-[hsl(var(--accent-customer)/0.75)]"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

