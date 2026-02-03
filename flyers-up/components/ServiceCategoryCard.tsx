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
      <div className="bg-surface border border-hairline shadow-card rounded-[18px] p-6 hover:shadow-card transition-shadow cursor-pointer">
        {/* Icon */}
        <div className="text-4xl mb-3">{category.icon}</div>
        
        {/* Name */}
        <h3 className="text-lg font-semibold text-text mb-2">
          {category.name}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted">
          {category.description}
        </p>
        
        {/* Arrow indicator */}
        <div className="mt-4 text-accent text-sm font-medium">
          Browse Pros →
        </div>
      </div>
    </Link>
  );
}
