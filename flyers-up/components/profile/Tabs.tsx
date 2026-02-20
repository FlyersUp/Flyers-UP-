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
    <div className="border-b border-hairline">
      <div className="flex items-center justify-between gap-2">
        {tabs.map((t) => {
          const isOn = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={[
                'relative flex-1 py-3 text-xs font-medium tracking-wide',
                'transition-colors',
                isOn ? 'text-text' : 'text-muted hover:text-text',
              ].join(' ')}
              aria-current={isOn ? 'page' : undefined}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span aria-hidden>{t.icon}</span>
                <span>{t.label}</span>
              </span>
              {isOn ? (
                <span
                  className="absolute left-1/2 -bottom-[1px] h-[2px] w-10 -translate-x-1/2 rounded-full bg-[var(--role-border)]"
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

