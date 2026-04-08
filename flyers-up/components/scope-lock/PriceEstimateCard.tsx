'use client';

import type { PriceEstimate } from '@/lib/scopeLock/priceCalculator';

export interface PriceEstimateCardProps {
  estimate: PriceEstimate;
  className?: string;
}

export function PriceEstimateCard({ estimate, className = '' }: PriceEstimateCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold text-[#6B7280] dark:text-white/55">AI price estimate</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6B7280] dark:text-white/55">Base (sq ft × $0.10)</span>
          <span className="text-[#2d3436] dark:text-white">${estimate.breakdown.base_price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280] dark:text-white/55">Bedrooms</span>
          <span className="text-[#2d3436] dark:text-white">${estimate.breakdown.bedroom_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280] dark:text-white/55">Bathrooms</span>
          <span className="text-[#2d3436] dark:text-white">${estimate.breakdown.bathroom_cost.toFixed(2)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-[#E8EAED] pt-3 dark:border-white/10">
          <span className="text-[#6B7280] dark:text-white/55">Subtotal</span>
          <span className="text-[#2d3436] dark:text-white">${estimate.subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-[#E8EAED] pt-3 font-semibold dark:border-white/10">
          <span className="text-[#2d3436] dark:text-white">Suggested range</span>
          <span className="text-[#2d3436] dark:text-white">
            ${estimate.estimate_low.toFixed(0)} – ${estimate.estimate_high.toFixed(0)}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#6B7280] dark:text-white/50">
          Pros may adjust the price based on their assessment.
        </p>
      </div>
    </div>
  );
}
