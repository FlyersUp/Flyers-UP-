'use client';

/**
 * Browse Occupations - high-conversion marketplace discovery
 */
import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OccupationGrid } from '@/components/occupations/OccupationGrid';
import { OccupationSearchBar } from '@/components/occupations/OccupationSearchBar';

type Occupation = { id: string; name: string; slug: string; icon: string | null; featured: boolean };

export default function OccupationsPage() {
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/occupations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setOccupations(data.occupations ?? []))
      .catch(() => setOccupations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return occupations;
    const q = search.trim().toLowerCase();
    return occupations.filter((o) => o.name.toLowerCase().includes(q));
  }, [occupations, search]);

  const topPicks = useMemo(
    () => occupations.filter((o) => o.featured).slice(0, 5),
    [occupations]
  );
  const topPicksSlugs = useMemo(() => new Set(topPicks.map((o) => o.slug)), [topPicks]);
  const gridOccupations = useMemo(
    () => (search.trim() ? filtered : filtered.filter((o) => !topPicksSlugs.has(o.slug))),
    [filtered, search, topPicksSlugs]
  );

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-32">
        <div className="max-w-4xl mx-auto px-4">
          {/* Hero */}
          <section className="pt-6 pb-5">
            <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">
              What do you need done today?
            </h1>
            <p className="text-base text-text2 mt-1.5">
              Book trusted local pros in minutes
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-full bg-[rgba(156,167,100,0.12)] text-[hsl(var(--accent-customer))] text-sm font-medium">
              Popular in your area
            </div>
          </section>

          {/* Sticky search bar */}
          <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-4 bg-bg/95 backdrop-blur-sm border-b border-border/50">
            <OccupationSearchBar value={search} onChange={setSearch} />
          </div>

          {/* Top Picks Near You - horizontal scroll */}
          {!loading && topPicks.length > 0 && !search.trim() && (
            <section className="mt-6 mb-8">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">
                Top Picks Near You
              </h2>
              <OccupationGrid
                occupations={topPicks}
                variant="topPicks"
                showBadges
              />
            </section>
          )}

          {/* All occupations - 2-col grid */}
          <section>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-[hsl(var(--card-neutral))] border border-border p-4 h-36 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {search.trim() && (
                  <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-3">
                    Search results
                  </h2>
                )}
                {!search.trim() && gridOccupations.length > 0 && (
                  <h2 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-3">
                    All occupations
                  </h2>
                )}
                <OccupationGrid occupations={gridOccupations} variant="all" />
              </>
            )}
          </section>

          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-[hsl(var(--card-neutral))] border border-border p-8 text-center text-text3 mt-4">
              No occupations found.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
