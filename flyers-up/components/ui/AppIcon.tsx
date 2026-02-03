 'use client';

import Image from 'next/image';
import { useState } from 'react';

export type AppIconName =
  | 'home'
  | 'bell'
  | 'chat'
  | 'settings'
  | 'id-card'
  | 'building'
  | 'calendar'
  | 'credit-card'
  | 'star'
  | 'user'
  | 'map-pin'
  | 'shield-check'
  | 'file-text'
  | 'plus';

export function AppIcon({
  name,
  size = 20,
  className = '',
  alt,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
  alt?: string;
}) {
  // PNG-first (what you're using from Flaticon), SVG fallback (placeholders).
  const [ext, setExt] = useState<'png' | 'svg'>('png');
  return (
    <Image
      src={`/icons/${name}.${ext}`}
      alt={alt ?? name}
      width={size}
      height={size}
      className={['inline-block', 'opacity-90', className].join(' ')}
      onError={() => {
        // If PNG missing, fall back to SVG placeholder.
        if (ext !== 'svg') setExt('svg');
      }}
      unoptimized
    />
  );
}

