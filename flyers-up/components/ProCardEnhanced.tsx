/**
 * Enhanced Pro Card Component
 * Card-based listing for service marketplace with avatar, rating, price, and CTA
 */

import Image from 'next/image';
import Link from 'next/link';
import Badge, { VerifiedBadge } from './ui/Badge';
import { RatingCompact } from './ui/RatingStars';
import type { MockPro } from '@/lib/mockData';

interface ProCardEnhancedProps {
  pro: MockPro;
  className?: string;
}

export default function ProCardEnhanced({ pro, className = '' }: ProCardEnhancedProps) {
  return (
    <div 
      className={`
        bg-surface rounded-2xl border border-border overflow-hidden
        card-hover transition-smooth
        ${className}
      `}
    >
      {/* Card content */}
      <div className="p-5">
        {/* Header with avatar */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface2 flex items-center justify-center">
              {pro.avatar && pro.avatar.trim() !== '' ? (
                <Image
                  src={pro.avatar}
                  alt={pro.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            {/* Online indicator */}
            {pro.available && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-2 border-surface rounded-full" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text truncate">{pro.name}</h3>
              {pro.verified && <VerifiedBadge />}
            </div>
            
            <p className="text-sm text-muted/70 mb-2">{pro.category} • {pro.location}</p>
            
            <RatingCompact rating={pro.rating} reviewCount={pro.reviewCount} />
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-muted line-clamp-2 mb-4">
          {pro.bio}
        </p>

        {/* Badges */}
        {pro.badges && pro.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {pro.badges.slice(0, 3).map((badge, index) => (
              <Badge
                key={typeof badge === 'string' ? badge : badge.id || index}
                variant="verified"
              >
                {typeof badge === 'string' ? badge : badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted/70 uppercase tracking-wide">Starting at</p>
            <p className="text-xl font-bold text-text">${pro.startingPrice}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/pro/${pro.id}`}
              className="px-4 py-2.5 bg-surface2 hover:bg-surface text-text rounded-xl text-sm font-medium transition-colors"
            >
              View Profile
            </Link>
            <Link
              href={`/booking/${pro.id}`}
              className="px-4 py-2.5 bg-accent hover:opacity-95 text-accentContrast rounded-xl text-sm font-medium transition-opacity btn-press"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>

      {/* Availability footer */}
      <div className={`px-5 py-3 text-sm ${pro.available ? 'bg-success/15 text-text' : 'bg-surface2 text-muted/70'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${pro.available ? 'bg-accent' : 'bg-muted/60'}`} />
          {pro.available ? (
            <>Available • Responds in {pro.responseTime}</>
          ) : (
            <>Currently unavailable</>
          )}
        </div>
      </div>
    </div>
  );
}




