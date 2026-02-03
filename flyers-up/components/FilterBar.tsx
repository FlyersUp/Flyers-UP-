'use client';

/**
 * Filter Bar Component
 * Category toggles and search input for marketplace
 */

import { useState } from 'react';
import type { ServiceCategory } from '@/lib/mockData';

interface FilterBarProps {
  categories: ServiceCategory[];
  selectedCategory: string;
  onCategoryChange: (slug: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export default function FilterBar({
  categories,
  selectedCategory,
  onCategoryChange,
  onSearch,
  className = '',
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by city, ZIP, or service..."
          value={searchQuery}
          onChange={handleSearch}
          className="
            w-full pl-11 pr-4 py-3 
            bg-surface border border-border rounded-xl
            text-text placeholder:text-muted/70
            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-transparent
            transition-all
          "
        />
      </div>

      {/* Category toggles */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onCategoryChange(category.slug)}
            className={`
              flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full
              text-sm font-medium transition-all
              ${selectedCategory === category.slug
                ? 'bg-accent text-accentContrast shadow-md'
                : 'bg-surface border border-border text-text hover:bg-surface2 hover:border-border'
              }
            `}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}




