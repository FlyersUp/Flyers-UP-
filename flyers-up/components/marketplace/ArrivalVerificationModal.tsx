'use client';

import { useState, useCallback } from 'react';

export interface ArrivalVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  bookingId: string;
}

export function ArrivalVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
}: ArrivalVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const captureLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || 'Location unavailable')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const handleSubmit = async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const { lat, lng } = await captureLocation();
      let arrivalPhotoUrl: string | undefined;
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        const uploadRes = await fetch(`/api/bookings/${bookingId}/arrive/photo`, {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const json = await uploadRes.json();
          arrivalPhotoUrl = json.url;
        }
      }
      const res = await fetch(`/api/bookings/${bookingId}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, arrival_photo_url: arrivalPhotoUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to verify arrival');
        return;
      }
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#111] mb-2">Verify Arrival</h2>
        <p className="text-sm text-black/60 mb-4">
          We&apos;ll use your location to verify you&apos;ve arrived at the job site. This helps prevent disputes.
        </p>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-[#F5F5F5]/60">
            <p className="text-sm text-black/70">
              Your location will be captured when you tap &quot;Verify arrival&quot;.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111] mb-2">
              Arrival photo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#B2FBA5] file:font-semibold file:text-black"
            />
            {photoPreview && (
              <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-[#F5F5F5]">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
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
            className="flex-1 py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify arrival'}
          </button>
        </div>
      </div>
    </div>
  );
}
