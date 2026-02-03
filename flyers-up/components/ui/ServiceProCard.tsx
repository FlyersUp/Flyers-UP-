'use client';

import { Card } from './Card';
import { OfficialBadge } from './OfficialBadge';

interface ServiceProCardProps {
  name: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  photo?: string;
  badges?: string[];
  onClick?: () => void;
  accentLeft?: boolean;
}

/**
 * Service Pro listing card with rail + stripe
 */
export function ServiceProCard({
  name,
  rating,
  reviewCount,
  startingPrice,
  photo,
  badges = [],
  onClick,
  accentLeft = false,
}: ServiceProCardProps) {
  return (
    <Card
      withRail={false}
      onClick={onClick}
      className={['mb-4', accentLeft ? 'border-l-[3px] border-l-accent' : ''].join(' ')}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl bg-surface2 flex-shrink-0 overflow-hidden">
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              👤
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text mb-1">{name}</h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-warning">★</span>
            <span className="text-sm font-medium text-text">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm text-muted/70">({reviewCount})</span>
          </div>
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {badges.map((badge, i) => (
                <OfficialBadge key={i}>{badge}</OfficialBadge>
              ))}
            </div>
          )}
          
          {/* Price */}
          <div className="text-sm text-muted">
            From <span className="font-semibold text-text">${startingPrice}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}












