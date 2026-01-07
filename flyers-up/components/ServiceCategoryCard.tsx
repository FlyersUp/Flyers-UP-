/**
 * Service Category Card
 * Displays a clickable category card for service browsing
 * 
 * Updated to work with Supabase data structure.
 */

import Link from 'next/link';
import type { ServiceCategory } from '@/lib/api';

interface ServiceCategoryCardProps {
  category: ServiceCategory;
}

export default function ServiceCategoryCard({ category }: ServiceCategoryCardProps) {
  return (
    <Link href={`/services/${category.slug}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
        {/* Icon */}
        <div className="text-4xl mb-3">{category.icon}</div>
        
        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {category.name}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600">
          {category.description}
        </p>
        
        {/* Arrow indicator */}
        <div className="mt-4 text-blue-600 text-sm font-medium">
          Browse Pros →
        </div>
      </div>
    </Link>
  );
}
