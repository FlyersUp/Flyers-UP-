'use client';

import type { OccupationServiceRow } from '@/lib/occupationData';

export function OccupationServicesChecklist({
  services,
  selectedIds,
  onChangeSelectedIds,
  loading,
  emptyHint = 'No services added yet for this occupation.',
}: {
  services: OccupationServiceRow[];
  selectedIds: string[];
  onChangeSelectedIds: (next: string[]) => void;
  loading?: boolean;
  emptyHint?: string;
}) {
  if (loading) {
    return <p className="text-sm text-muted py-6">Loading services…</p>;
  }

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface2/30 p-8 text-center">
        <p className="text-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {services.map((svc) => (
        <label
          key={svc.id}
          className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-surface2 cursor-pointer transition-all has-[:checked]:border-accent has-[:checked]:bg-accent/5 has-[:checked]:ring-2 has-[:checked]:ring-accent/30"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(svc.id)}
            onChange={(e) => {
              if (e.target.checked) {
                onChangeSelectedIds([...selectedIds, svc.id]);
              } else {
                onChangeSelectedIds(selectedIds.filter((id) => id !== svc.id));
              }
            }}
            className="rounded border-border size-5 shrink-0"
          />
          <div>
            <span className="text-text font-medium">{svc.name}</span>
            {svc.description ? (
              <span className="text-muted text-sm block mt-0.5">{svc.description}</span>
            ) : null}
          </div>
        </label>
      ))}
    </div>
  );
}
