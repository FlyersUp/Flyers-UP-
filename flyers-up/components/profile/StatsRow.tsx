export type StatItem = {
  label: string;
  value: string;
  accent?: boolean;
};

export function StatsRow({ items }: { items: StatItem[] }) {
  return (
    <div className="flex items-center gap-5">
      {items.map((it) => (
        <div key={it.label} className="min-w-[4.5rem]">
          <div className={['text-base font-semibold leading-tight', it.accent ? 'text-accent' : 'text-text'].join(' ')}>
            {it.value}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

