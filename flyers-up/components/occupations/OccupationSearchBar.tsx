'use client';

import { Search, X } from 'lucide-react';

interface OccupationSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function OccupationSearchBar({ value, onChange }: OccupationSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text3"
        strokeWidth={2}
      />
      <input
        type="text"
        placeholder="Search occupations…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-12 py-3 rounded-full bg-surface border border-border text-text text-base placeholder:text-sm placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent shadow-sm"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-text3 hover:text-text hover:bg-surface2 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
