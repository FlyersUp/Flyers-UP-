'use client';

import { Search } from 'lucide-react';

interface OccupationSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function OccupationSearchBar({ value, onChange }: OccupationSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" strokeWidth={1.5} />
      <input
        type="text"
        placeholder="Search occupations…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-black/5 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]/50 focus:border-[#B2FBA5] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      />
    </div>
  );
}
