'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, CheckCircle2, Clock, Shield, XCircle } from 'lucide-react';
import Link from 'next/link';

export interface ReliabilityData {
  reliabilityScore: number;
  canAcceptBookings: boolean;
  noShowCount30d: number;
  lateArrivalCount30d: number;
  warnings: { id: string; title: string; message: string }[];
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs improvement';
  return 'At risk';
}

function getNextStep(data: ReliabilityData): { text: string; href?: string } | null {
  if (!data.canAcceptBookings) {
    return { text: 'Contact support to resolve account restrictions.', href: '/pro/settings' };
  }
  if (data.warnings.some((w) => w.id === 'low-reliability' || w.id === 'reliability-warning')) {
    return {
      text: 'Complete jobs on time and communicate clearly with customers to improve your score.',
      href: '/pro/settings/business',
    };
  }
  if (data.warnings.some((w) => w.id === 'no-show-urgent')) {
    return {
      text: 'Show up on time for your next jobs to restore same-day availability.',
      href: '/pro/bookings',
    };
  }
  if (data.warnings.some((w) => w.id === 'late-arrivals')) {
    return {
      text: 'Leave earlier for jobs or update your ETA if you’re running late.',
      href: '/pro/today',
    };
  }
  return { text: 'Keep up the good work—arrive on time and complete jobs as agreed.' };
}

export function ReliabilityCard() {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/pro/reliability', { credentials: 'include' });
        if (!mounted) return;
        if (!res.ok) {
          setError('Could not load reliability');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        if (mounted) setError('Could not load reliability');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="mb-6 border-l-4 border-l-muted">
        <div className="flex items-center gap-3 p-4">
          <Shield className="h-5 w-5 text-muted animate-pulse" />
          <div>
            <div className="text-sm font-semibold text-text">Reliability</div>
            <div className="text-xs text-muted">Loading…</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const hasWarnings = data.warnings.length > 0;
  const nextStep = getNextStep(data);

  return (
    <Card
      className={`mb-6 border-l-4 ${
        hasWarnings && !data.canAcceptBookings
          ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
          : hasWarnings
            ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
            : 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
      }`}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {data.canAcceptBookings ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-semibold text-text">Reliability</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getScoreColor(data.reliabilityScore)}`}>
                  {data.reliabilityScore}
                </span>
                <span className="text-xs text-muted">{getScoreLabel(data.reliabilityScore)}</span>
              </div>
            </div>
          </div>
          <div
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              data.canAcceptBookings
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
            }`}
          >
            {data.canAcceptBookings ? 'Can accept' : 'Restricted'}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {data.noShowCount30d} no-show{data.noShowCount30d !== 1 ? 's' : ''} (30d)
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {data.lateArrivalCount30d} late arrival{data.lateArrivalCount30d !== 1 ? 's' : ''} (30d)
          </span>
        </div>

        {data.warnings.length > 0 && (
          <div className="space-y-2">
            {data.warnings.map((w) => (
              <div
                key={w.id}
                className="flex gap-2 p-2.5 rounded-lg bg-white/60 dark:bg-black/20 border border-amber-200/60 dark:border-amber-800/40"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-900 dark:text-amber-100">{w.title}</div>
                  <div className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5">{w.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextStep && (
          <div className="pt-1 text-sm text-muted">
            <span className="font-medium text-text">Next:</span> {nextStep.text}
            {nextStep.href && (
              <Link href={nextStep.href} className="ml-1 text-accent hover:underline">
                Learn more →
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
