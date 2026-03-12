'use client';

export type PriceAdjustmentReason =
  | 'larger_space'
  | 'extra_rooms'
  | 'heavy_condition'
  | 'additional_tasks'
  | 'safety_concern';

export interface PriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrice: number;
  newPrice: number;
  reason: PriceAdjustmentReason;
  message?: string;
  proName?: string;
  onAccept: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  isLoading?: boolean;
}

const REASON_LABELS: Record<PriceAdjustmentReason, string> = {
  larger_space: 'Larger space than described',
  extra_rooms: 'Extra rooms not listed',
  heavy_condition: 'Heavier condition than described',
  additional_tasks: 'Additional tasks required',
  safety_concern: 'Safety concern',
};

export function PriceAdjustmentModal({
  isOpen,
  onClose,
  originalPrice,
  newPrice,
  reason,
  message,
  proName,
  onAccept,
  onReject,
  isLoading = false,
}: PriceAdjustmentModalProps) {
  if (!isOpen) return null;

  const handleAccept = async () => {
    await onAccept();
    onClose();
  };

  const handleReject = async () => {
    await onReject();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#111] mb-2">Price Adjustment Request</h2>
        {proName && (
          <p className="text-sm text-black/60 mb-4">{proName} has requested a price adjustment.</p>
        )}

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-[#F5F5F5]/60">
            <p className="text-sm text-black/70 mb-1">Reason</p>
            <p className="font-medium text-[#111]">{REASON_LABELS[reason]}</p>
          </div>

          {message && (
            <div className="p-4 rounded-xl bg-[#F5F5F5]/60">
              <p className="text-sm text-black/70 mb-1">Message</p>
              <p className="text-[#111]">{message}</p>
            </div>
          )}

          <div className="flex justify-between items-center p-4 rounded-xl border border-black/10">
            <span className="text-sm text-black/70">Original price</span>
            <span className="font-medium text-[#111]">${(originalPrice / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-4 rounded-xl bg-[#B2FBA5]/20 border border-[#B2FBA5]/50">
            <span className="text-sm font-medium text-[#111]">New price</span>
            <span className="font-bold text-[#111]">${(newPrice / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl border border-black/20 text-[#111] font-medium hover:bg-[#F5F5F5] disabled:opacity-60"
          >
            Cancel Job
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95 disabled:opacity-60"
          >
            Accept New Price
          </button>
        </div>
      </div>
    </div>
  );
}
