'use client';

/**
 * Choose an occupation - Replaces legacy "Choose a category" page.
 * Shows featured occupations from DB, links to /occupations/[slug].
 * See OCCUPATION_MIGRATION_NOTES.md for files updated in this refactor.
 */
import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { OccupationGrid } from '@/components/occupations/OccupationGrid';
import { OccupationSearchBar } from '@/components/occupations/OccupationSearchBar';

type Occupation = { id: string; name: string; slug: string; icon: string | null; featured: boolean };

export default function ChooseOccupationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/signin?next=/customer/categories');
        return;
      }
      setReady(true);

      try {
        const res = await fetch('/api/occupations?featured=true', { cache: 'no-store' });
        const data = await res.json();
        setOccupations(data.occupations ?? []);
      } catch {
        setOccupations([]);
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [router]);

  const featured = occupations.slice(0, 5);
  const filtered = search.trim()
    ? featured.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : featured;

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
              Choose an occupation
            </h1>
            <p className="text-sm text-zinc-500 mb-4">
              Browse first, request when ready
            </p>
            <div className="mb-4">
              <OccupationSearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-black/5 p-5 h-24 animate-pulse shadow-[0_10px_25px_rgba(0,0,0,0.06)]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white border border-black/5 p-8 shadow-[0_10px_25px_rgba(0,0,0,0.06)] border-l-4 border-l-[#B2FBA5]">
              <div className="text-base font-semibold text-zinc-900">No occupations found</div>
              <p className="mt-1 text-sm text-zinc-500">
                {search.trim() ? 'Try a different search.' : 'Occupations will appear here once they’re added.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/occupations"
                  className="text-sm font-medium text-zinc-900 hover:underline"
                >
                  Browse all occupations →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <OccupationGrid occupations={filtered} variant="featured" />
              </div>
              <div className="rounded-2xl bg-white border border-black/5 p-5 shadow-[0_10px_25px_rgba(0,0,0,0.06)] mb-6">
                <p className="text-sm text-zinc-600 mb-2">
                  Pick an occupation, then choose a service.
                </p>
                <p className="text-xs text-zinc-500">
                  Need more options? Browse all occupations below.
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/occupations"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-black/5 text-zinc-900 font-medium shadow-[0_10px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
                >
                  More occupations →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
