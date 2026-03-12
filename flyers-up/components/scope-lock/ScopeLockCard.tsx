'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface ScopeLockCardProps {
  jobSummary: {
    title: string;
    address: string;
    date: string;
    time: string;
    jobDetails?: Record<string, unknown>;
  };
  photos: Array<{ category: string; url: string }>;
  proPrice: number;
  depositAmount: number;
  remainingBalance: number;
  onConfirmScope: () => void | Promise<void>;
  onEditDetails: () => void;
  isLoading?: boolean;
}

export function ScopeLockCard({
  jobSummary,
  photos,
  proPrice,
  depositAmount,
  remainingBalance,
  onConfirmScope,
  onEditDetails,
  isLoading = false,
}: ScopeLockCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    setConfirming(true);
    try {
      await onConfirmScope();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111] mb-4">Scope Lock Confirmation</h2>
      <p className="text-sm text-black/70 mb-4">
        Please review the job details and photos before paying the deposit. Your deposit will only be charged after you confirm.
      </p>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-xl bg-[#F5F5F5]/60">
          <h3 className="text-sm font-medium text-[#111] mb-2">Job Summary</h3>
          <p className="text-[#111] font-medium">{jobSummary.title}</p>
          <p className="text-sm text-black/60 mt-1">{jobSummary.address}</p>
          <p className="text-sm text-black/60">
            {jobSummary.date} at {jobSummary.time}
          </p>
        </div>

        {photos.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#111] mb-2">Uploaded Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F5F5]">
                  <Image
                    src={p.url}
                    alt={p.category}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#F5F5F5]/60 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-black/70">Selected Pro price</span>
            <span className="font-semibold text-[#111]">${proPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-black/70">Deposit amount</span>
            <span className="font-semibold text-[#111]">${(depositAmount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-black/70">Remaining balance</span>
            <span className="font-semibold text-[#111]">${(remainingBalance / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
        <p className="text-sm text-amber-900">
          <strong>Legal notice:</strong> Price may change if job details differ from description. The Pro may request a price adjustment upon arrival if the job scope differs.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-6">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={isLoading}
          className="mt-1 w-4 h-4 rounded border-black/20 text-[#B2FBA5] focus:ring-[#B2FBA5]"
        />
        <span className="text-sm text-[#111]">
          I confirm the job details and photos accurately represent the job.
        </span>
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onEditDetails}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl border border-black/20 text-[#111] font-medium hover:bg-[#F5F5F5] disabled:opacity-60 transition-opacity"
        >
          Edit Details
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!confirmed || confirming || isLoading}
          className="flex-1 py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {confirming ? 'Confirming…' : 'Confirm Scope'}
        </button>
      </div>
    </div>
  );
}
