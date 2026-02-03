import React from 'react';
import { PlacardHeader } from './PlacardHeader';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface NoticePanelProps {
  title: string;
  tone?: NoticeTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Warm "no surprises" panel for trust: expectations, policies, safety notes.
 */
export function NoticePanel({ title, tone = 'info', children, className = '' }: NoticePanelProps) {
  return (
    <div className={className}>
      <PlacardHeader title={title} tone={tone} />
      <div className="mt-2 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-muted leading-relaxed">
        {children}
      </div>
    </div>
  );
}

