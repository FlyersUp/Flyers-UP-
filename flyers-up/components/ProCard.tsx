/**
 * Pro Card Component
 * Displays service professional info with booking CTA
 * 
 * Updated to work with Supabase data structure.
 */

import Link from 'next/link';
import type { ServicePro } from '@/lib/api';

interface ProCardProps {
  pro: ServicePro;
}

export default function ProCard({ pro }: ProCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
      {/* Header: Name and Rating */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-text">{pro.name}</h3>
          <p className="text-sm text-muted/70">{pro.location}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-warning">★</span>
            <span className="font-medium">{pro.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted/70">({pro.reviewCount} reviews)</p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-muted mb-4 line-clamp-2">
        {pro.bio}
      </p>

      {/* Footer: Price and CTA */}
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <div>
          <span className="text-sm text-muted/70">Starting at</span>
          <p className="text-lg font-bold text-text">${pro.startingPrice}/hr</p>
        </div>
        <Link
          href={`/book/${pro.id}`}
          className="bg-accent hover:opacity-95 text-accentContrast px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
        >
          Request Booking
        </Link>
      </div>

      {/* Availability indicator */}
      {pro.available ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-accent">
          <span className="w-2 h-2 bg-accent rounded-full"></span>
          Available now
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted/60">
          <span className="w-2 h-2 bg-muted/60 rounded-full"></span>
          Currently unavailable
        </div>
      )}
    </div>
  );
}
