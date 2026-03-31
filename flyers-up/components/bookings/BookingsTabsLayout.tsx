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
    <div className="max-w-4xl w-full min-w-0 mx-auto px-4 py-6">
      <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-3">{title}</h2>

      <div className="mb-6 flex flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto sm:pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-[hsl(var(--accent-customer)/0.6)] bg-[hsl(var(--accent-customer)/0.2)] text-text'
                : 'border-border bg-surface text-text3 hover:bg-hover hover:text-text'
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
