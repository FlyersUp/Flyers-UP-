'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { FlyWallJobCard } from '@/components/flyers/FlyWallJobCard';
import { getCurrentUser } from '@/lib/api';
import { fetchFlyWallEntries, type FlyWallEntry } from '@/lib/flyWall';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SideMenu } from '@/components/ui/SideMenu';
import { useTranslations } from 'next-intl';
import { useLaunchMode } from '@/hooks/useLaunchMode';

const PAGE_SIZE = 12;

function getRotation(index: number): number {
  const rotations = [0.6, -1, 0.4, -0.8, 1, -0.5, 0.9, -1.1];
  return rotations[index % rotations.length];
}

export default function FlyerWallPage() {
  const t = useTranslations('flyerWall');
  const router = useRouter();
  const launchMode = useLaunchMode();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<'customer' | 'pro'>('customer');
  const [userName, setUserName] = useState('Account');
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<FlyWallEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loadLock = useRef(false);

  const isPro = role === 'pro';
  const layoutMode = isPro ? 'pro' : 'customer';

  useEffect(() => {
    if (!launchMode || !ready) return;
    router.replace(isPro ? '/pro?coming_soon=1' : '/customer?coming_soon=1');
  }, [launchMode, ready, isPro, router]);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/flyer-wall')}`);
        return;
      }
      setRole(user.role === 'pro' ? 'pro' : 'customer');
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router]);

  const loadInitial = useCallback(async () => {
    setInitialLoading(true);
    try {
      const rows = await fetchFlyWallEntries(PAGE_SIZE, 0);
      setItems(rows);
      setOffset(rows.length);
      setHasMore(rows.length >= PAGE_SIZE);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadInitial();
  }, [ready, loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadLock.current || !hasMore) return;
    loadLock.current = true;
    setLoadingMore(true);
    try {
      const rows = await fetchFlyWallEntries(PAGE_SIZE, offset);
      if (rows.length < PAGE_SIZE) setHasMore(false);
      setItems((prev) => [...prev, ...rows]);
      setOffset((o) => o + rows.length);
    } finally {
      setLoadingMore(false);
      loadLock.current = false;
    }
  }, [hasMore, offset]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ready || initialLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          void loadMore();
        }
      },
      { rootMargin: '240px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, initialLoading, hasMore, loadingMore, loadMore]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">{t('loading')}</p>
        </div>
      </AppLayout>
    );
  }

  const secondaryHref = isPro ? '/leaderboard' : '/top-pros';
  const secondaryLabel = isPro ? t('headerLeaderboard') : t('headerTopPros');

  return (
    <AppLayout mode={layoutMode}>
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-[#F5F5F5] border border-black/10 text-black/70 hover:bg-[#F5F5F5]/90 transition-colors"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="text-center min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-[#111] truncate">
                {isPro ? t('titlePro') : t('titleCustomer')}
              </h1>
              <p className="text-xs text-black/55 truncate hidden sm:block">
                {isPro ? t('subtitlePro') : t('subtitleCustomer')}
              </p>
            </div>
            <Link
              href={secondaryHref}
              className="text-xs font-semibold text-[#111] whitespace-nowrap px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {initialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full max-w-[340px] h-[380px] rounded-2xl bg-gray-200/90 animate-pulse"
                  style={{ transform: `rotate(${getRotation(i)}deg)` }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-white p-8 sm:p-10 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-base font-semibold text-[#111]">{t('emptyTitle')}</p>
              <p className="text-sm text-black/60 mt-2 leading-relaxed">{t('emptyBody')}</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/occupations"
                  className="inline-flex justify-center items-center min-h-[44px] px-5 rounded-xl bg-[#111] text-white text-sm font-semibold hover:opacity-95"
                >
                  {t('emptyCtaBrowse')}
                </Link>
                <Link
                  href={isPro ? '/pro/jobs' : '/customer/requests'}
                  className="inline-flex justify-center items-center min-h-[44px] px-5 rounded-xl border border-black/15 text-sm font-semibold text-[#111] hover:bg-black/5"
                >
                  {isPro ? t('emptyCtaPro') : t('emptyCtaRequest')}
                </Link>
              </div>
              <p className="text-xs text-black/45 mt-6">{t('emptyTrust')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-black/55 mb-5 max-w-2xl">
                {isPro ? t('introPro') : t('introCustomer')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
                {items.map((entry, i) => (
                  <FlyWallJobCard
                    key={entry.completionId}
                    entry={entry}
                    profileHref={`/customer/pros/${entry.proId}`}
                    rotation={getRotation(i)}
                    showProEnhancements={isPro}
                    trendingLabel={isPro ? t('trending') : undefined}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="h-8 w-full" aria-hidden />
              {loadingMore && (
                <p className="text-center text-sm text-black/50 py-4">{t('loadingMore')}</p>
              )}
            </>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role={role} userName={userName} />
    </AppLayout>
  );
}
