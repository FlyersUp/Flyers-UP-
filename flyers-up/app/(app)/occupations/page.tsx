'use client';

/**
 * More Occupations - grid of all occupations with search
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

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-6">All Occupations</h1>
          <div className="mb-6">
            <OccupationSearchBar value={search} onChange={setSearch} />
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-gray-200 border border-black/5 p-5 h-20 animate-pulse shadow-[0_10px_25px_rgba(0,0,0,0.06)]"
                />
              ))}
            </div>
          ) : (
            <OccupationGrid occupations={filtered} variant="all" />
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white border border-black/5 p-8 text-center text-zinc-500 shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
              No occupations found.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
