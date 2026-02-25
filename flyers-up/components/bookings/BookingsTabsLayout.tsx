'use client';

import { ReactNode } from 'react';

export type BookingsTab = 'active' | 'history' | 'all';

export interface BookingsTabsLayoutProps {
  activeTab: BookingsTab;
  onTabChange: (tab: BookingsTab) => void;
  title?: string;
  children: ReactNode;
}

export function BookingsTabsLayout({
  activeTab,
  onTabChange,
  title = 'Bookings',
  children,
}: BookingsTabsLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-text mb-6">{title}</h1>

      <div className="flex gap-2 mb-6 border-b border-[var(--hairline)]">
        {(['active', 'history', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeTab === tab
                ? 'border-text text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {children}
    </div>
  );
}
