'use client';

import Link from 'next/link';
import { ChevronRight, LogOut } from 'lucide-react';

export type SettingsHomeRow = {
  label: string;
  href: string;
  value?: string;
};

export type SettingsHomeSection = {
  title: string;
  rows: SettingsHomeRow[];
};

interface SettingsHomeProps {
  sections: SettingsHomeSection[];
  onSignOut: () => void;
  signingOut: boolean;
  signOutError?: string | null;
}

export function SettingsHome({
  sections,
  onSignOut,
  signingOut,
  signOutError,
}: SettingsHomeProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-8 space-y-6">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text3 mb-2.5">
            {section.title}
          </h2>
          <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
            {section.rows.map((row, idx) => (
              <Link
                key={row.label}
                href={row.href}
                className={[
                  'flex items-center justify-between gap-3 px-4 py-3.5 text-sm',
                  'hover:bg-[hsl(var(--accent-customer)/0.08)] transition-colors',
                  idx > 0 ? 'border-t border-border' : '',
                ].join(' ')}
              >
                <span className="text-text">{row.label}</span>
                <span className="inline-flex items-center gap-2 text-text3">
                  {row.value ? <span className="text-xs">{row.value}</span> : null}
                  <ChevronRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="w-full h-11 rounded-2xl border border-border bg-surface text-sm font-semibold text-text hover:bg-[hsl(var(--accent-customer)/0.08)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        {signOutError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{signOutError}</p>
        ) : null}
      </section>
    </div>
  );
}
