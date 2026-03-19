'use client';

export type Service = { id: string; name: string };

interface ServiceChipsProps {
  services: Service[];
  selectedServiceId?: string | null;
  onSelect?: (serviceId: string | null) => void;
}

export function ServiceChips({
  services,
  selectedServiceId,
  onSelect,
}: ServiceChipsProps) {
  const handleAll = () => onSelect?.(null);
  const handleService = (id: string) => onSelect?.(id);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      <button
        type="button"
        onClick={handleAll}
        className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
          selectedServiceId == null
            ? 'border border-[hsl(var(--accent-customer)/0.6)] bg-[hsl(var(--accent-customer)/0.2)] text-text'
            : 'bg-surface border border-border text-text2 hover:border-borderStrong hover:text-text hover:bg-hover/70'
        }`}
      >
        All
      </button>
      {services.map((svc) => {
        const isActive = selectedServiceId === svc.id;
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => handleService(svc.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              isActive
                ? 'border border-[hsl(var(--accent-customer)/0.6)] bg-[hsl(var(--accent-customer)/0.2)] text-text'
                : 'bg-surface border border-border text-text2 hover:border-borderStrong hover:text-text hover:bg-hover/70'
            }`}
          >
            {svc.name}
          </button>
        );
      })}
    </div>
  );
}
