'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getServiceCategories, type ServiceCategory } from '@/lib/api';
import { getProfile, upsertProfile } from '@/lib/onboarding';

type Step = 'service' | 'zip' | 'pros' | 'name';

type ProRow = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  location: string;
  categoryName: string;
};

function CustomerRequestStartInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('service');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [zip, setZip] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loadingPros, setLoadingPros] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookProId, setBookProId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/customer/request/start' + (nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''))}`);
        return;
      }
      const cats = await getServiceCategories({ includeHidden: false });
      setCategories(cats);
      setReady(true);
    };
    void init();
  }, [router, nextParam]);

  const canGoToZip = categorySlug.trim().length > 0;
  const canLoadPros = zip.trim().length >= 3;

  async function loadPros() {
    if (!canLoadPros || !categorySlug) return;
    setLoadingPros(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customer/pros?categorySlug=${encodeURIComponent(categorySlug)}&zip=${encodeURIComponent(zip.trim())}&radiusMiles=${radiusMiles}`
      );
      const json = await res.json();
      if (!json.ok) {
        setPros([]);
        setError(json.error || 'Could not load pros.');
        return;
      }
      setPros(
        (json.pros ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          rating: p.rating ?? 0,
          reviewCount: p.reviewCount ?? 0,
          startingPrice: p.startingPrice ?? 0,
          location: p.location || p.serviceAreaZip || '',
          categoryName: json.categoryName || categoryName,
        }))
      );
      setCategoryName(json.categoryName || categoryName);
      setStep('pros');
    } finally {
      setLoadingPros(false);
    }
  }

  async function handleBookPro(proId: string) {
    const user = await getCurrentUser();
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(`/book/${proId}`)}`);
      return;
    }
    const profile = await getProfile(user.id);
    const hasName = profile?.first_name?.trim() && profile?.last_name?.trim();
    if (hasName) {
      router.push(`/book/${proId}`);
      return;
    }
    setBookProId(proId);
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setStep('name');
  }

  async function submitNameAndBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookProId) return;
    const user = await getCurrentUser();
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await upsertProfile({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: user.email ?? null,
      });
      if (!res.success) {
        setError(res.error ?? 'Could not save.');
        return;
      }
      router.push(`/book/${bookProId}`);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center text-muted">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-2">Request a service</h1>
        <p className="text-sm text-muted mb-6">Select a service and zip to see pros near you.</p>

        {step === 'service' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-muted">Service</label>
            <select
              value={categorySlug}
              onChange={(e) => {
                const c = categories.find((x) => x.slug === e.target.value);
                setCategorySlug(e.target.value);
                setCategoryName(c?.name ?? '');
              }}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text"
            >
              <option value="">Select a service…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!canGoToZip}
              onClick={() => setStep('zip')}
              className="w-full rounded-xl bg-accent text-accentContrast py-3 font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {step === 'zip' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep('service')} className="text-sm text-muted hover:text-text">
              ← Change service
            </button>
            <p className="text-sm text-muted">Service: {categoryName || categorySlug}</p>
            <label className="block text-sm font-medium text-muted">Your zip code</label>
            <input
              type="text"
              inputMode="numeric"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10001"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text"
            />
            <label className="block text-sm font-medium text-muted mt-3">Search radius</label>
            <select
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text"
            >
              <option value={0}>My zip only</option>
              <option value={10}>Within 10 miles</option>
              <option value={25}>Within 25 miles</option>
              <option value={50}>Wider search (50+ miles)</option>
            </select>
            <button
              type="button"
              disabled={!canLoadPros || loadingPros}
              onClick={() => void loadPros()}
              className="w-full rounded-xl bg-accent text-accentContrast py-3 font-semibold disabled:opacity-50"
            >
              {loadingPros ? 'Loading…' : 'Show pros near you'}
            </button>
          </div>
        )}

        {step === 'pros' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setStep('zip')} className="text-sm text-muted hover:text-text">
                ← Change zip
              </button>
              <span className="text-muted">|</span>
              <label className="text-sm text-muted">Radius:</label>
              <select
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="text-sm border border-border rounded-lg px-2 py-1 bg-surface text-text"
              >
                <option value={0}>My zip only</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50+ miles</option>
              </select>
              <button
                type="button"
                onClick={() => void loadPros()}
                disabled={loadingPros}
                className="text-sm text-accent hover:text-text font-medium disabled:opacity-50"
              >
                {loadingPros ? 'Searching…' : 'Update search'}
              </button>
            </div>
            <p className="text-sm text-muted">
              {categoryName} {radiusMiles === 0 ? `in ${zip}` : `near ${zip} (${radiusMiles === 50 ? '50+ mi' : `within ${radiusMiles} mi`})`}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {pros.length === 0 && !loadingPros && (
              <p className="text-muted">No pros found for this search. Try a wider radius, different zip, or category.</p>
            )}
            <ul className="space-y-3">
              {pros.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <div>
                    <div className="font-semibold text-text">{p.name}</div>
                    <div className="text-sm text-muted">
                      {p.rating > 0 ? `${p.rating} · ` : ''}
                      {p.reviewCount > 0 ? `${p.reviewCount} reviews` : ''}
                      {p.location ? ` · ${p.location}` : ''}
                    </div>
                  </div>
                  <Link
                    href={`/customer/pros/${p.id}`}
                    className="text-sm text-muted hover:text-text shrink-0"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleBookPro(p.id)}
                    className="shrink-0 rounded-xl bg-accent text-accentContrast px-4 py-2 text-sm font-semibold"
                  >
                    Book
                  </button>
                </li>
              ))}
            </ul>
            <Link href={safeNext ?? '/customer'} className="block text-center text-sm text-muted hover:text-text">
              Go to dashboard
            </Link>
          </div>
        )}

        {step === 'name' && bookProId && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Almost there. We need your name to confirm the request.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <form onSubmit={submitNameAndBook} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text"
                    placeholder="Sam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-accent text-accentContrast py-3 font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Continue to booking'}
              </button>
            </form>
            <button type="button" onClick={() => { setStep('pros'); setBookProId(null); }} className="text-sm text-muted hover:text-text">
              ← Back to pros
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CustomerRequestStartPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-2xl mx-auto px-4 py-8 text-center text-muted">Loading…</div>
        </AppLayout>
      }
    >
      <CustomerRequestStartInner />
    </Suspense>
  );
}
