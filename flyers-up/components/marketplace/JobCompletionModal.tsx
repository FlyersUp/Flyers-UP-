'use client';

import { useState } from 'react';

export interface JobCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  bookingId: string;
}

/** Encouraged for trust / disputes; not required for completion or payout (Version B). */
const RECOMMENDED_AFTER_PHOTOS = 2;

export function JobCompletionModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
}: JobCompletionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/bookings/${bookingId}/complete/photos`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Upload failed');
    return json.url;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const url = await uploadPhoto(file);
      setPhotoUrls((prev) => [...prev, url].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          after_photo_urls: photoUrls,
          completion_note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to complete job');
        return;
      }
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#111] mb-2">Complete Job</h2>
        <p className="text-sm text-black/60 mb-4">
          Upload at least 2 after photos. These are required before the customer can pay the remaining balance.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#111] mb-2">
              After photos (recommended {RECOMMENDED_AFTER_PHOTOS}+)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#F5F5F5]">
                  <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photoUrls.length < 6 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-black/20 flex items-center justify-center cursor-pointer hover:border-[#B2FBA5]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <span className="text-2xl text-black/40">+</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111] mb-2">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes about the job..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-black/20 text-[#111] font-medium hover:bg-[#F5F5F5] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Completing…' : 'Complete Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
