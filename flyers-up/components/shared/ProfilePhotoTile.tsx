'use client';

import Image from 'next/image';
import { Camera } from 'lucide-react';

/**
 * Profile photo tile: real photo or "No photo yet" placeholder.
 * No initials avatars.
 */
export function ProfilePhotoTile({
  src,
  alt = '',
  size = 80,
  className = '',
}: {
  src: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  if (src && src.trim()) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-black/5 bg-black/[0.03] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Camera size={size * 0.35} className="text-black/30" strokeWidth={1.5} />
      <span className="text-[10px] font-medium text-black/40">No photo yet</span>
    </div>
  );
}
