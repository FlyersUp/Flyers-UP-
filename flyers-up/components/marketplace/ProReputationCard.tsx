'use client';

export interface ProReputationCardProps {
  averageRating: number;
  jobsCompleted: number;
  onTimeRate: number;
  scopeAccuracyRate: number;
  repeatCustomerRate: number;
  completionRate?: number;
  className?: string;
}

export function ProReputationCard({
  averageRating,
  jobsCompleted,
  onTimeRate,
  scopeAccuracyRate,
  repeatCustomerRate,
  completionRate,
  className = '',
}: ProReputationCardProps) {
  const formatPct = (n: number) => `${Math.round(n)}%`;

  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-[#111]">{averageRating.toFixed(1)}</span>
        <span className="text-lg text-amber-500">★</span>
        <span className="text-sm text-[#6A6A6A]">Overall Rating</span>
      </div>
      <p className="text-sm text-[#3A3A3A] mb-4">{jobsCompleted} Jobs Completed</p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">On-time</span>
          <span className="font-medium text-[#111]">{formatPct(onTimeRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Scope Accuracy</span>
          <span className="font-medium text-[#111]">{formatPct(scopeAccuracyRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Repeat Clients</span>
          <span className="font-medium text-[#111]">{formatPct(repeatCustomerRate)}</span>
        </div>
        {completionRate != null && (
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Completion Rate</span>
            <span className="font-medium text-[#111]">{formatPct(completionRate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
