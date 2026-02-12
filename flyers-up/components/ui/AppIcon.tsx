 'use client';

import Image from 'next/image';

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
  | 'safety-check'
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
  // Use SVG icons from `/public/icons` to avoid noisy 404s for missing PNGs.
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={alt ?? name}
      width={size}
      height={size}
      className={['inline-block', 'opacity-90', className].join(' ')}
      unoptimized
    />
  );
}

