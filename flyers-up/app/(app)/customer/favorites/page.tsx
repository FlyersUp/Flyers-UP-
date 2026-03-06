'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import Image from 'next/image';

type Favorite = {
  proId: string;
  createdAt: string;
  pro: { id: string; displayName: string; logoUrl?: string | null; serviceName: string } | null;
};

export default function CustomerFavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/customer/favorites', { cache: 'no-store' });
        const json = await res.json();
        if (mounted && json.ok && json.favorites) setFavorites(json.favorites);
      } catch {
        if (mounted) setFavorites([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">Favorite Pros</h1>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-[var(--hairline)] p-6" style={{ backgroundColor: '#F5F5F5' }}>
            <p className="text-sm font-medium text-text">No favorite pros yet</p>
            <p className="mt-1 text-sm text-muted">Tap the star on a pro profile to save them here for quick rebooking.</p>
            <Link href="/occupations" className="mt-4 inline-block text-sm font-medium text-text hover:underline">
              Browse occupations
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((f) => (
              <Link
                key={f.proId}
                href={`/pro/${f.proId}`}
                className="flex gap-4 rounded-2xl border border-[var(--hairline)] p-5 hover:shadow-sm transition-all"
                style={{ backgroundColor: '#F5F5F5' }}
              >
                <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-surface2 border border-hairline flex items-center justify-center">
                  {f.pro?.logoUrl ? (
                    <Image src={f.pro.logoUrl} alt="" width={48} height={48} className="object-cover" />
                  ) : (
                    <span className="text-lg text-muted">👤</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text">{f.pro?.displayName || 'Pro'}</div>
                  <div className="text-sm text-muted">{f.pro?.serviceName || 'Service'}</div>
                </div>
                <span className="text-accent">View profile →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
