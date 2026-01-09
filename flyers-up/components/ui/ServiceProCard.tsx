'use client';

import { Card } from './Card';
import { Badge } from './Badge';
import { Rail } from './Rail';

interface ServiceProCardProps {
  name: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  photo?: string;
  badges?: string[];
  onClick?: () => void;
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
}: ServiceProCardProps) {
  return (
    <Card withRail onClick={onClick} className="mb-4">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden">
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
          <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-500">★</span>
            <span className="text-sm font-medium text-gray-700">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">({reviewCount})</span>
          </div>
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {badges.map((badge, i) => (
                <Badge key={i} variant="verified">{badge}</Badge>
              ))}
            </div>
          )}
          
          {/* Price */}
          <div className="text-sm text-gray-600">
            From <span className="font-semibold text-gray-900">${startingPrice}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}












