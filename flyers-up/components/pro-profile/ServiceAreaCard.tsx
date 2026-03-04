'use client';

interface ServiceAreaCardProps {
  serviceRadiusMiles: number | null;
}

export function ServiceAreaCard({ serviceRadiusMiles }: ServiceAreaCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Service area</h3>
      <p className="mt-2 text-sm text-text">
        {serviceRadiusMiles != null && serviceRadiusMiles > 0
          ? `Up to ${serviceRadiusMiles} miles`
          : 'Service area available on request'}
      </p>
    </div>
  );
}
