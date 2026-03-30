'use client';

import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GrowthMenuItemDto } from '@/lib/pro/growth-menu-types';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

function rowClasses(_state: GrowthMenuItemDto['state']): string {
  return 'text-text hover:bg-hover/65 active:bg-hover';
}

function GrowthRow({
  row,
  title,
  onNavigate,
}: {
  row: GrowthMenuItemDto;
  title: string;
  onNavigate: () => void;
}) {
  const muted = row.state === 'locked' ? 'opacity-[0.88]' : '';

  const inner = (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition ${rowClasses(row.state)} ${muted}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {row.state === 'locked' && (
            <Lock size={16} className="flex-shrink-0 text-text2" aria-hidden />
          )}
          <span className="text-[1.05rem] font-medium">{title}</span>
        </div>
        {row.subtitle ? (
          <p className="mt-1 text-[0.9rem] leading-snug pr-1 text-text2">{row.subtitle}</p>
        ) : null}
        {row.state === 'locked' && row.progressRequired != null && row.progressCurrent != null ? (
          <div className="mt-2 h-1.5 w-full max-w-[200px] rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-[hsl(var(--accent-pro)/0.85)]"
              style={{
                width: `${Math.min(100, Math.round((row.progressCurrent / row.progressRequired) * 100))}%`,
              }}
            />
          </div>
        ) : null}
      </div>
      <ChevronRight size={20} className="flex-shrink-0 text-text3" aria-hidden />
    </div>
  );

  return (
    <Link href={row.href} className="block" onClick={onNavigate}>
      {inner}
    </Link>
  );
}

export function ProGrowthMenuSection({
  title,
  subtitleColor,
  onNavigate,
}: {
  title: string;
  subtitleColor: string;
  onNavigate: () => void;
}) {
  const t = useTranslations();
  const { data, error, loading } = useProGrowthMenu();

  return (
    <div className="mb-8">
      <div
        className="text-[0.95rem] font-semibold uppercase tracking-[0.03em]"
        style={{ color: subtitleColor }}
      >
        {title}
      </div>
      <div className="mt-3 border-t border-border" />
      <div className="mt-2">
        {error && <p className="px-4 py-3 text-sm text-text2">Could not load Growth menu</p>}
        {loading && !data && !error && (
          <div className="px-4 py-3 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="h-14 rounded-2xl bg-surface2" />
            ))}
          </div>
        )}
        {data?.items.map((row) => (
          <GrowthRow
            key={row.id}
            row={row}
            title={t(row.titleKey)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
