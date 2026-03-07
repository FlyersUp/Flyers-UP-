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
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600"
        strokeWidth={2}
      />
      <input
        type="text"
        placeholder="Search occupations…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-12 py-3 rounded-full bg-white border border-black/5 text-zinc-900 text-base placeholder:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]/50 focus:border-[#B2FBA5] shadow-sm"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
