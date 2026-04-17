'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser } from '@/lib/api';
import { fetchWeeklyLeaderboard, type WeeklyLeaderboardRow } from '@/lib/flyWall';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SideMenu } from '@/components/ui/SideMenu';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { LaunchModeClientRedirect } from '@/components/launch-mode/LaunchModeClientRedirect';

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<WeeklyLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/leaderboard')}`);
        return;
      }
      if (user.role !== 'pro') {
        router.replace('/top-pros');
        return;
      }
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchWeeklyLeaderboard(null);
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <AppLayout mode="pro">
        <LaunchModeClientRedirect href="/pro?coming_soon=1" />
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">{t('loading')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <LaunchModeClientRedirect href="/pro?coming_soon=1" />
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-[#F5F5F5] border border-black/10 text-black/70 hover:bg-[#F5F5F5]/90 transition-colors"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-semibold text-[#111] text-center flex-1">{t('title')}</h1>
            <Link
              href="/flyer-wall"
              className="text-xs font-semibold text-[#111] whitespace-nowrap px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5"
            >
              {t('flyWallLink')}
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-sm text-black/60 mb-6">{t('subtitle')}</p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-200/90 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-medium text-[#111]">{t('emptyTitle')}</p>
              <p className="text-sm text-black/55 mt-2">{t('emptyBody')}</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {rows.map((r) => (
                <li key={r.proId}>
                  <Link
                    href={`/customer/pros/${encodeURIComponent(r.proId)}`}
                    className="flex items-center gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 shadow-sm hover:border-black/15 transition-colors"
                  >
                    <span className="w-10 text-xl font-bold text-[#C8854D] tabular-nums shrink-0">{r.rank}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111] truncate">{r.proDisplayName}</p>
                      <p className="text-xs text-black/50 truncate">{r.categoryName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#111] tabular-nums">
                        {t('jobsThisWeek', { count: r.jobsCompletedWeek })}
                      </p>
                      <p className="text-xs text-black/55 inline-flex items-center justify-end gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" aria-hidden />
                        {r.averageRating > 0 ? r.averageRating.toFixed(1) : '—'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          <p className="text-xs text-black/45 mt-8 leading-relaxed">{t('footnote')}</p>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="pro" userName={userName} />
    </AppLayout>
  );
}
