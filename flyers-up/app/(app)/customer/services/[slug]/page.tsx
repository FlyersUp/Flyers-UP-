'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import Image from 'next/image';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { useCategoryGate, visibleStateFromGate } from '@/hooks/useCategoryGate';
import { NYC_BOROUGH_OPTIONS, boroughLabelFromSlug } from '@/lib/marketplace/nycBoroughs';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ListFilter,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

interface MarketplacePro {
  id: string;
  display_name: string;
  profile_photo_url: string | null;
  logo_url: string | null;
  category_name: string | null;
  rating: number;
  review_count: number;
  starting_price: number;
  location: string | null;
  business_hours: string | null;
  service_radius: number | null;
  bio: string | null;
}

type SortKey = 'recommended' | 'rating_desc' | 'price_asc' | 'price_desc' | 'reviews_desc';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'rating_desc', label: 'Top rated' },
  { key: 'price_asc', label: 'Price: Low to high' },
  { key: 'price_desc', label: 'Price: High to low' },
  { key: 'reviews_desc', label: 'Most reviewed' },
];

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function isTopRated(pro: MarketplacePro): boolean {
  return pro.rating >= 4.8 && pro.review_count >= 20;
}

function availabilityLabel(pro: MarketplacePro): string {
  if (pro.business_hours && pro.business_hours.trim().length > 0) {
    return 'Availability posted';
  }
  return 'Availability on profile';
}

function locationLabel(pro: MarketplacePro): string {
  const radius = pro.service_radius != null && pro.service_radius > 0 ? `Within ${pro.service_radius} mi` : null;
  if (pro.location && radius) return `${pro.location} • ${radius}`;
  if (pro.location) return pro.location;
  if (radius) return radius;
  return 'Local service area';
}

export default function ServiceProListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [serviceName, setServiceName] = useState<string>('Marketplace');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(null);
  const [pros, setPros] = useState<MarketplacePro[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('Near you');
  const [sortBy, setSortBy] = useState<SortKey>('recommended');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [boroughSlug, setBoroughSlug] = useState('brooklyn');
  const { state: gateState } = useCategoryGate(slug, boroughSlug);
  const gateMode = visibleStateFromGate(gateState);
  const [onlyTopRated, setOnlyTopRated] = useState(false);
  const [onlyAvailabilityPosted, setOnlyAvailabilityPosted] = useState(false);
  const [maxStartingPrice, setMaxStartingPrice] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/signin?next=/customer/services/${encodeURIComponent(slug)}`);
        return;
      }
      setReady(true);
    };
    void check();
  }, [router, slug]);

  const loadMarketplace = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, subRes, prosRes] = await Promise.all([
        fetch('/api/marketplace/services', { cache: 'no-store' }),
        fetch(`/api/marketplace/subcategories?serviceSlug=${encodeURIComponent(slug)}`, { cache: 'no-store' }),
        fetch(
          `/api/marketplace/pros?serviceSlug=${encodeURIComponent(slug)}${
            selectedSubcategorySlug ? `&subcategorySlug=${encodeURIComponent(selectedSubcategorySlug)}` : ''
          }`,
          { cache: 'no-store' }
        ),
      ]);

      const servicesData = await servicesRes.json();
      const subData = await subRes.json();
      const prosData = await prosRes.json();

      const svc = (servicesData.services ?? []).find((s: { slug: string }) => s.slug === slug);
      setServiceName(svc?.name ?? slug);
      setSubcategories((subData.subcategories ?? []) as Subcategory[]);
      setPros((prosData.pros ?? []) as MarketplacePro[]);
    } catch {
      setError('We could not load marketplace results right now.');
      setPros([]);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !slug) return;
    void loadMarketplace();
  }, [ready, slug, selectedSubcategorySlug]);

  const filteredPros = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...pros];

    if (q) {
      list = list.filter((p) => {
        const haystack = [
          p.display_name,
          p.category_name ?? '',
          p.location ?? '',
          p.bio ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (onlyTopRated) {
      list = list.filter((p) => isTopRated(p));
    }
    if (onlyAvailabilityPosted) {
      list = list.filter((p) => Boolean(p.business_hours && p.business_hours.trim()));
    }
    if (maxStartingPrice != null) {
      list = list.filter((p) => p.starting_price <= maxStartingPrice);
    }

    switch (sortBy) {
      case 'rating_desc':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_asc':
        list.sort((a, b) => a.starting_price - b.starting_price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.starting_price - a.starting_price);
        break;
      case 'reviews_desc':
        list.sort((a, b) => b.review_count - a.review_count);
        break;
      case 'recommended':
      default:
        list.sort((a, b) => {
          const scoreA = a.rating * 20 + Math.min(50, a.review_count);
          const scoreB = b.rating * 20 + Math.min(50, b.review_count);
          return scoreB - scoreA;
        });
        break;
    }

    return list;
  }, [pros, searchQuery, onlyTopRated, onlyAvailabilityPosted, maxStartingPrice, sortBy]);

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (selectedSubcategorySlug) {
      const sub = subcategories.find((s) => s.slug === selectedSubcategorySlug);
      chips.push({
        key: 'subcategory',
        label: sub?.name ?? 'Subcategory',
        onRemove: () => setSelectedSubcategorySlug(null),
      });
    }
    if (onlyTopRated) {
      chips.push({ key: 'top', label: 'Top rated', onRemove: () => setOnlyTopRated(false) });
    }
    if (onlyAvailabilityPosted) {
      chips.push({ key: 'availability', label: 'Availability posted', onRemove: () => setOnlyAvailabilityPosted(false) });
    }
    if (maxStartingPrice != null) {
      chips.push({
        key: 'price',
        label: `Max $${maxStartingPrice}`,
        onRemove: () => setMaxStartingPrice(null),
      });
    }
    return chips;
  }, [selectedSubcategorySlug, subcategories, onlyTopRated, onlyAvailabilityPosted, maxStartingPrice]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3 bg-bg/95 backdrop-blur-md border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Link
                href="/customer/services"
                className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center text-text hover:bg-surface2 transition-colors"
                aria-label="Back to services"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-text truncate">{serviceName}</h1>
                <p className="text-xs text-muted">Browse trusted local pros</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-[11px] text-muted whitespace-nowrap" htmlFor="borough-select">
                    Borough
                  </label>
                  <select
                    id="borough-select"
                    value={boroughSlug}
                    onChange={(e) => setBoroughSlug(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text"
                  >
                    {NYC_BOROUGH_OPTIONS.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  {gateMode !== 'legacy' && gateMode !== 'unlisted' ? (
                    <span className="text-[11px] rounded-full bg-surface2 px-2 py-0.5 text-muted">
                      Supply: {gateMode}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Search pros or services"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
                  aria-label="Search pros"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="h-11 px-3 rounded-xl border border-border bg-surface text-text text-sm font-medium inline-flex items-center gap-1.5 hover:bg-surface2"
                aria-expanded={showFilters}
                aria-controls="marketplace-filter-panel"
              >
                <ListFilter size={16} />
                Filters
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
                  aria-label="Location"
                />
              </div>
              <div className="inline-flex rounded-xl border border-border overflow-hidden bg-surface" role="tablist" aria-label="View mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  className={`h-10 px-3 text-sm font-medium ${viewMode === 'list' ? 'bg-accent text-accentContrast' : 'text-text hover:bg-surface2'}`}
                >
                  List
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'map'}
                  onClick={() => setViewMode('map')}
                  className={`h-10 px-3 text-sm font-medium ${viewMode === 'map' ? 'bg-accent text-accentContrast' : 'text-text hover:bg-surface2'}`}
                >
                  Map
                </button>
              </div>
            </div>

            {showFilters ? (
              <div
                id="marketplace-filter-panel"
                className="mt-3 rounded-2xl border border-border bg-surface p-3 space-y-3"
              >
                {subcategories.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Service type</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubcategorySlug(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          !selectedSubcategorySlug
                            ? 'bg-accent text-accentContrast'
                            : 'bg-surface2 text-text border border-border'
                        }`}
                      >
                        All
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedSubcategorySlug(sub.slug)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                            selectedSubcategorySlug === sub.slug
                              ? 'bg-accent text-accentContrast'
                              : 'bg-surface2 text-text border border-border'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyTopRated}
                      onChange={(e) => setOnlyTopRated(e.target.checked)}
                    />
                    Top rated
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyAvailabilityPosted}
                      onChange={(e) => setOnlyAvailabilityPosted(e.target.checked)}
                    />
                    Availability posted
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                    <span className="text-muted">Max price</span>
                    <select
                      value={maxStartingPrice ?? ''}
                      onChange={(e) => setMaxStartingPrice(e.target.value ? Number(e.target.value) : null)}
                      className="ml-auto bg-transparent text-text focus:outline-none"
                    >
                      <option value="">Any</option>
                      <option value="75">$75</option>
                      <option value="100">$100</option>
                      <option value="150">$150</option>
                      <option value="250">$250</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {appliedChips.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {appliedChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-3 py-1.5 text-xs font-medium text-text"
                  >
                    {chip.label}
                    <X size={12} aria-hidden />
                    <span className="sr-only">Remove {chip.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="py-4">
            {gateMode === 'unlisted' ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
                <h2 className="text-lg font-semibold text-text">Not available in {boroughLabelFromSlug(boroughSlug)}</h2>
                <p className="text-sm text-muted">
                  This service is hidden in this borough right now (supply gate). Try another borough or request help
                  finding a pro.
                </p>
                <Link
                  href={`/customer/match?serviceSlug=${encodeURIComponent(slug)}&borough=${encodeURIComponent(boroughSlug)}`}
                  className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accentContrast hover:opacity-95"
                >
                  Request this service
                </Link>
              </div>
            ) : null}

            {gateMode === 'weak' ? (
              <div className="mb-5 rounded-2xl border-2 border-accent/50 bg-accent/10 p-5 shadow-sm">
                <p className="text-base font-bold text-text">Limited supply in {boroughLabelFromSlug(boroughSlug)}</p>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  Fewer verified pros are online for this category right now. Getting matched is the fastest path — we
                  shortlist responders and keep booking below if you prefer to self-serve.
                </p>
                <Link
                  href={`/customer/match?serviceSlug=${encodeURIComponent(slug)}&borough=${encodeURIComponent(boroughSlug)}`}
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3.5 text-center text-base font-bold text-accentContrast shadow-sm hover:opacity-95"
                >
                  Get matched (recommended)
                </Link>
              </div>
            ) : null}

            {gateMode === 'strong' ? (
              <div className="mb-3 text-right">
                <Link
                  href={`/customer/match?serviceSlug=${encodeURIComponent(slug)}&borough=${encodeURIComponent(boroughSlug)}`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Need help choosing? Get matched
                </Link>
              </div>
            ) : null}

            {gateMode === 'unlisted' ? null : (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-muted">
                    {loading
                      ? 'Loading results…'
                      : `${filteredPros.length} pro${filteredPros.length === 1 ? '' : 's'} near ${locationQuery || 'you'}`}
                  </p>
                  <div className="relative">
                    <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="h-9 pl-8 pr-8 rounded-lg border border-border bg-surface text-sm text-text appearance-none focus:outline-none focus:ring-2 focus:ring-accent/25"
                      aria-label="Sort results"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-5">
                <h2 className="text-base font-semibold text-red-800 dark:text-red-300">Couldn&apos;t load marketplace</h2>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadMarketplace()}
                  className="mt-3 inline-flex items-center rounded-xl bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-xl bg-surface2" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-surface2 rounded" />
                        <div className="h-3 w-1/2 bg-surface2 rounded" />
                        <div className="h-3 w-2/3 bg-surface2 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'map' ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <h2 className="text-base font-semibold text-text">Map view preview</h2>
                  <p className="text-sm text-muted mt-1">
                    Map pins are coming soon. List view remains available below.
                  </p>
                </div>
                <div className="space-y-3">
                  {filteredPros.map((pro) => (
                    <ProResultCard key={pro.id} pro={pro} slug={slug} selectedSubcategorySlug={selectedSubcategorySlug} />
                  ))}
                </div>
              </div>
            ) : filteredPros.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
                <h2 className="text-lg font-semibold text-text">No matching pros</h2>
                <p className="text-sm text-muted mt-1">
                  Try removing filters or searching another service nearby.
                </p>
                {(gateMode === 'strong' || gateMode === 'weak' || gateMode === 'legacy') && (
                  <Link
                    href={`/customer/match?serviceSlug=${encodeURIComponent(slug)}&borough=${encodeURIComponent(boroughSlug)}`}
                    className="inline-flex w-full max-w-sm justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accentContrast hover:opacity-95"
                  >
                    Get matched — we&apos;ll find a vetted pro
                  </Link>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setOnlyTopRated(false);
                      setOnlyAvailabilityPosted(false);
                      setMaxStartingPrice(null);
                      setSelectedSubcategorySlug(null);
                    }}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface2"
                  >
                    Reset filters
                  </button>
                  <Link
                    href="/occupations"
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text hover:bg-surface2"
                  >
                    Browse occupations
                  </Link>
                </div>
              </div>
            ) : (
                  <div className="space-y-3">
                    {filteredPros.map((pro) => (
                      <ProResultCard
                        key={pro.id}
                        pro={pro}
                        slug={slug}
                        selectedSubcategorySlug={selectedSubcategorySlug}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ProResultCard({
  pro,
  slug,
  selectedSubcategorySlug,
}: {
  pro: MarketplacePro;
  slug: string;
  selectedSubcategorySlug: string | null;
}) {
  const photo = pro.profile_photo_url || pro.logo_url;

  const bookHref = useMemo(() => {
    const base = `/book/${encodeURIComponent(pro.id)}`;
    const params = new URLSearchParams();
    params.set('serviceSlug', slug);
    if (selectedSubcategorySlug) params.set('subcategorySlug', selectedSubcategorySlug);
    return `${base}?${params.toString()}`;
  }, [pro.id, selectedSubcategorySlug, slug]);

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 rounded-xl overflow-hidden bg-surface2 flex-shrink-0">
          {photo ? (
            <Image src={photo} alt={pro.display_name} width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted">
              {getInitials(pro.display_name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text truncate">{pro.display_name}</h3>
              <p className="text-sm text-muted truncate">{pro.category_name ?? 'Service Pro'}</p>
            </div>
            {isTopRated(pro) ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <BadgeCheck size={12} />
                Top rated
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-text">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-semibold">{pro.rating.toFixed(1)}</span>
              <span className="text-muted">({pro.review_count})</span>
            </span>
            <span className="text-text font-semibold">From ${pro.starting_price}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {locationLabel(pro)}
            </span>
            <span aria-hidden>•</span>
            <span>{availabilityLabel(pro)}</span>
          </div>

          {pro.bio ? (
            <p className="mt-2 text-sm text-muted line-clamp-2">{pro.bio}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
        <Link
          href={`/customer/pros/${encodeURIComponent(pro.id)}`}
          className="flex-1 rounded-xl border border-border py-2.5 text-center text-sm font-semibold text-text hover:bg-surface2"
        >
          View profile
        </Link>
        <Link
          href={bookHref}
          className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-accentContrast hover:opacity-95"
        >
          Book
        </Link>
      </div>
    </article>
  );
}
