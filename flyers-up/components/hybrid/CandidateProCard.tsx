'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CandidatePro } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface CandidateProCardProps {
  candidate: CandidatePro;
  onSendOffer?: (id: string) => void;
  onAssign?: (id: string) => void;
  className?: string;
}

function speedLabel(tier: CandidatePro['responseSpeed']): string {
  if (tier === 'fast') return 'Fast responder';
  if (tier === 'medium') return 'Medium response';
  if (tier === 'slow') return 'Slower response';
  return 'Response unknown';
}

export function CandidateProCard({ candidate, onSendOffer, onAssign, className }: CandidateProCardProps) {
  const initials =
    candidate.name
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const contacted =
    candidate.lastContactedMinutesAgo != null
      ? `Last contacted ${candidate.lastContactedMinutesAgo} min ago`
      : 'Not contacted yet on this request';

  return (
    <article className={cn('rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-surface2">
            {candidate.avatarUrl ? (
              <Image src={candidate.avatarUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[hsl(var(--trust))]">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-bold text-text ring-1 ring-border">
                #{candidate.rank}
              </span>
              <h3 className="truncate font-bold text-text">{candidate.name}</h3>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                {candidate.rankScore}% match
              </span>
              <span className="shrink-0 rounded-full bg-[hsl(222_44%_96%)] px-2 py-0.5 text-[10px] font-bold uppercase text-[hsl(var(--trust))] ring-1 ring-[hsl(var(--trust))]/15">
                {speedLabel(candidate.responseSpeed)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-3">
              <span className="inline-flex items-center gap-0.5 font-medium text-text">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                {candidate.rating.toFixed(1)}
              </span>
              <span>·</span>
              <span>{candidate.jobsCompleted} jobs (lifetime)</span>
              <span>·</span>
              <span>{candidate.jobsThisWeek} this week</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-text-2">{contacted}</p>
            <p className="mt-0.5 text-xs text-text-3">{candidate.neighborhoods}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidate.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-medium text-text-2 ring-1 ring-border"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium text-[hsl(var(--trust))]">{candidate.responseLabel}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" showArrow={false} type="button" onClick={() => onSendOffer?.(candidate.id)}>
          Send offer
        </Button>
        <Button variant="trust" size="sm" showArrow={false} type="button" onClick={() => onAssign?.(candidate.id)}>
          Assign directly
        </Button>
      </div>
    </article>
  );
}
