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
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      {/* Header: Name and Rating */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{pro.name}</h3>
          <p className="text-sm text-gray-500">{pro.location}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="font-medium">{pro.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">({pro.reviewCount} reviews)</p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {pro.bio}
      </p>

      {/* Footer: Price and CTA */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div>
          <span className="text-sm text-gray-500">Starting at</span>
          <p className="text-lg font-bold text-gray-800">${pro.startingPrice}/hr</p>
        </div>
        <Link
          href={`/book/${pro.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Request Booking
        </Link>
      </div>

      {/* Availability indicator */}
      {pro.available ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Available now
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Currently unavailable
        </div>
      )}
    </div>
  );
}
