'use client';

interface ServiceAreaCardProps {
  serviceRadiusMiles: number | null;
}

export function ServiceAreaCard({ serviceRadiusMiles }: ServiceAreaCardProps) {
  return (
    <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-4 shadow-sm shadow-black/5 dark:shadow-black/20">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6A6A6A] dark:text-[#A1A8B3]">Service area</h3>
      <p className="mt-2 text-sm text-[#111111] dark:text-[#F5F7FA]">
        {serviceRadiusMiles != null && serviceRadiusMiles > 0
          ? `Up to ${serviceRadiusMiles} miles`
          : 'Service area available on request'}
      </p>
    </div>
  );
}
