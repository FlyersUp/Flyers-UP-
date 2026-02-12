export type StatItem = {
  label: string;
  value: string;
};

export function StatsRow({ items }: { items: StatItem[] }) {
  return (
    <div className="flex items-center gap-5">
      {items.map((it) => (
        <div key={it.label} className="min-w-[4.5rem]">
          <div className="text-base font-semibold leading-tight">{it.value}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

