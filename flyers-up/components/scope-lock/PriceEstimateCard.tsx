'use client';

import type { PriceEstimate } from '@/lib/scopeLock/priceCalculator';

export interface PriceEstimateCardProps {
  estimate: PriceEstimate;
  className?: string;
}

export function PriceEstimateCard({ estimate, className = '' }: PriceEstimateCardProps) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">AI Price Estimate</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Base (sq ft × $0.10)</span>
          <span className="text-[#111111]">${estimate.breakdown.base_price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Bedrooms</span>
          <span className="text-[#111111]">${estimate.breakdown.bedroom_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Bathrooms</span>
          <span className="text-[#111111]">${estimate.breakdown.bathroom_cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-black/5 pt-3 mt-3">
          <span className="text-[#3A3A3A]">Subtotal</span>
          <span className="text-[#111111]">${estimate.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-black/5 pt-3 mt-3 font-semibold">
          <span className="text-[#111111]">Suggested range</span>
          <span className="text-[#111111]">
            ${estimate.estimate_low.toFixed(0)} – ${estimate.estimate_high.toFixed(0)}
          </span>
        </div>
        <p className="text-xs text-black/50 mt-2">
          Pros may adjust the price based on their assessment.
        </p>
      </div>
    </div>
  );
}
