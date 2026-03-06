'use client';

import { ReactNode } from 'react';

export type BookingsTab = 'active' | 'completed' | 'cancelled' | 'history' | 'all';

export interface BookingsTabsLayoutProps {
  activeTab: BookingsTab;
  onTabChange: (tab: BookingsTab) => void;
  title?: string;
  children: ReactNode;
}

const TAB_LABELS: Record<BookingsTab, string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  history: 'History',
  all: 'All',
};

export function BookingsTabsLayout({
  activeTab,
  onTabChange,
  title = 'Bookings',
  children,
}: BookingsTabsLayoutProps) {
  const tabs: BookingsTab[] = ['active', 'completed', 'cancelled'];
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">{title}</h2>

      <div className="flex gap-2 mb-6 border-b border-black/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-[#111] text-[#111]'
                : 'border-transparent text-black/60 hover:text-[#111]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {children}
    </div>
  );
}
