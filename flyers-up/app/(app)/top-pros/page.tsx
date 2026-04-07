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

export default function TopProsPage() {
  const t = useTranslations('topPros');
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
        router.replace(`/auth?next=${encodeURIComponent('/top-pros')}`);
        return;
      }
      if (user.role === 'pro') {
        router.replace('/leaderboard');
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
        setRows(data.slice(0, 10));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">{t('loading')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
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
            <div className="text-center flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-[#111] truncate">{t('title')}</h1>
              <p className="text-xs text-black/50 truncate hidden sm:block">{t('subtitle')}</p>
            </div>
            <Link
              href="/flyer-wall"
              className="text-xs font-semibold text-[#111] whitespace-nowrap px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5"
            >
              {t('flyWallLink')}
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-sm text-black/60 mb-6 leading-relaxed">{t('body')}</p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-200/90 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-medium text-[#111]">{t('emptyTitle')}</p>
              <p className="text-sm text-black/55 mt-2">{t('emptyBody')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.proId}>
                  <Link
                    href={`/customer/pros/${encodeURIComponent(r.proId)}`}
                    className="block rounded-xl border border-black/8 bg-white px-4 py-4 shadow-sm hover:border-black/15 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#111] truncate">{r.proDisplayName}</p>
                        <p className="text-sm text-black/55 mt-0.5">{r.categoryName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-[#111] inline-flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" aria-hidden />
                          {r.averageRating > 0 ? r.averageRating.toFixed(1) : '—'}
                        </p>
                        <p className="text-xs text-black/50 mt-1">{t('ratingLabel')}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-black/6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/55">
                      <span>
                        {t('jobsVerified', { count: r.jobsCompletedLifetime })}
                      </span>
                      {r.jobsCompletedWeek > 0 ? (
                        <span>{t('activeThisWeek', { count: r.jobsCompletedWeek })}</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-black/45 mt-8 leading-relaxed">{t('footnote')}</p>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="customer" userName={userName} />
    </AppLayout>
  );
}
