'use client';

/**
 * All Occupations - premium marketplace discovery
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

  const popular = useMemo(() => occupations.filter((o) => o.featured).slice(0, 6), [occupations]);
  const popularSlugs = useMemo(() => new Set(popular.map((o) => o.slug)), [popular]);
  const gridOccupations = useMemo(
    () => (search.trim() ? filtered : filtered.filter((o) => !popularSlugs.has(o.slug))),
    [filtered, search, popularSlugs]
  );

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5] pb-32">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="pt-6 pb-4">
            <h1 className="text-2xl font-semibold text-zinc-900">All Occupations</h1>
            <p className="text-sm text-zinc-500 mt-1">Browse services by trade</p>
          </div>

          {/* Sticky search bar */}
          <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-4 bg-[#F5F5F5]/95 backdrop-blur-sm">
            <OccupationSearchBar value={search} onChange={setSearch} />
          </div>

          {/* Popular occupations (optional) */}
          {!loading && popular.length > 0 && !search.trim() && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide mb-3">
                Popular occupations
              </h2>
              <OccupationGrid occupations={popular} variant="all" />
            </section>
          )}

          {/* Full grid */}
          <section>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-black/5 p-4 h-24 animate-pulse shadow-sm"
                  />
                ))}
              </div>
            ) : (
              <>
                {search.trim() && (
                  <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide mb-3">
                    Search results
                  </h2>
                )}
                {!search.trim() && gridOccupations.length > 0 && (
                  <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide mb-3">
                    All occupations
                  </h2>
                )}
                <OccupationGrid occupations={gridOccupations} variant="all" />
              </>
            )}
          </section>

          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white border border-black/5 p-8 text-center text-zinc-500 shadow-sm mt-4">
              No occupations found.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
