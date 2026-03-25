'use client';

import Image from 'next/image';
import { formatBookingTimeInZone } from '@/lib/datetime';

export interface ArrivalVerificationCardProps {
  arrivalTimestamp: string;
  locationVerified: boolean;
  arrivalPhotoUrl?: string | null;
  className?: string;
}

export function ArrivalVerificationCard({
  arrivalTimestamp,
  locationVerified,
  arrivalPhotoUrl,
  className = '',
}: ArrivalVerificationCardProps) {
  const time =
    arrivalTimestamp && !Number.isNaN(new Date(arrivalTimestamp).getTime())
      ? formatBookingTimeInZone(new Date(arrivalTimestamp).toISOString())
      : '—';

  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Arrival Verification</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#3A3A3A]">Arrival time</span>
          <span className="text-sm font-medium text-[#111]">{time}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#3A3A3A]">Location verified</span>
          <span
            className={`text-sm font-medium ${
              locationVerified ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {locationVerified ? 'Yes' : 'No'}
          </span>
        </div>
        {arrivalPhotoUrl && (
          <div className="pt-2">
            <p className="text-xs text-[#6A6A6A] mb-2">Arrival photo</p>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-[#F5F5F5]">
              <Image
                src={arrivalPhotoUrl}
                alt="Arrival"
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
