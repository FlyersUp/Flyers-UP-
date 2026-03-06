'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { BulletinFlyerCard, type BulletinFlyerPro } from '@/components/flyers/BulletinFlyerCard';
import { getCurrentUser, getProsForFlyerWall } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SideMenu } from '@/components/ui/SideMenu';

/** Slight rotation for organic bulletin board feel (1-2 degrees) */
function getRotation(index: number): number {
  const rotations = [1, -1.5, 0.5, -1, 1.2, -0.8, 1.5, -0.5];
  return rotations[index % rotations.length];
}

export default function FlyerWallPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pros, setPros] = useState<BulletinFlyerPro[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/flyer-wall')}`);
        return;
      }
      // Flyer Wall is customer-only; redirect pros to their home
      if (user.role === 'pro') {
        router.replace('/pro');
        return;
      }
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await getProsForFlyerWall();
        if (!mounted) return;
        setPros(
          data.map((p) => ({
            id: p.id,
            displayName: p.name,
            photoUrl: p.profilePhotoUrl ?? p.logoUrl ?? null,
            primaryCategory: p.categoryName,
            rating: p.rating,
            reviewsCount: p.reviewCount,
            startingPrice: p.startingPrice,
            location: p.location,
            availability: p.businessHours ?? null,
            sameDayAvailable: p.sameDayAvailable ?? false,
          }))
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [ready]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        {/* Bulletin board header */}
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-[#F5F5F5] border border-black/10 text-black/70 hover:bg-[#F5F5F5]/90 transition-colors"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-[#111]">Flyer Wall</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[320px] rounded-lg bg-[#F5F5F5]/80 animate-pulse"
                  style={{ transform: `rotate(${getRotation(i)}deg)` }}
                />
              ))}
            </div>
          ) : pros.length === 0 ? (
            <div className="bg-[#F5F5F5] rounded-xl p-8 text-center border border-black/8 shadow-sm">
              <p className="text-base font-medium text-[#111]">No flyers yet</p>
              <p className="text-sm text-black/60 mt-1">
                Pros will appear here as they join. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 justify-items-center">
              {pros.map((pro, i) => (
                <BulletinFlyerCard
                  key={pro.id}
                  pro={pro}
                  profileHref={`/customer/pros/${pro.id}`}
                  rotation={getRotation(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="customer" userName={userName} />
    </AppLayout>
  );
}
