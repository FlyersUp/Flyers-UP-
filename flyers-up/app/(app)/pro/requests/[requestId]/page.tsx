'use client';

/**
 * Pro: view an open customer job_request and submit a job_offer.
 */
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type JobRequestRow = {
  id: string;
  title: string;
  description: string | null;
  location: string;
  location_zip: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  expires_at: string;
  photos: unknown;
};

export default function ProJobRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<JobRequestRow | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [existingOfferId, setExistingOfferId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent(`/pro/requests/${requestId}`)}`);
        return;
      }
      setUserName(user.email?.split('@')[0] ?? 'Account');
      const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (!pro) {
        router.replace('/pro');
        return;
      }
      setProId((pro as { id: string }).id);
      setReady(true);
    };
    void guard();
  }, [router, requestId]);

  useEffect(() => {
    if (!ready || !proId || !requestId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: req, error: reqErr } = await supabase
        .from('job_requests')
        .select(
          'id, title, description, location, location_zip, service_category, budget_min, budget_max, preferred_date, preferred_time, status, expires_at, photos'
        )
        .eq('id', requestId)
        .maybeSingle();

      if (reqErr || !req) {
        setRequest(null);
        setError(reqErr?.message ?? 'Request not found.');
        setLoading(false);
        return;
      }

      const row = req as JobRequestRow;
      const expired = new Date(row.expires_at) < new Date();
      if (row.status !== 'open' || expired) {
        setError(expired ? 'This request has expired.' : 'This request is no longer open.');
        setRequest(row);
        setLoading(false);
        return;
      }

      setRequest(row);

      const { data: offer } = await supabase
        .from('job_offers')
        .select('id, price, message')
        .eq('request_id', requestId)
        .eq('pro_id', proId)
        .maybeSingle();

      if (offer) {
        const o = offer as { id: string; price: number; message: string | null };
        setExistingOfferId(o.id);
        setPrice(String(o.price ?? ''));
        setMessage(o.message ?? '');
      }

      setLoading(false);
    };

    void load();
  }, [ready, proId, requestId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!proId || !requestId) return;
    const p = parseFloat(price);
    if (!Number.isFinite(p) || p <= 0) {
      setError('Enter a valid price greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      if (existingOfferId) {
        const { error: upErr } = await supabase
          .from('job_offers')
          .update({ price: p, message: message.trim() || null })
          .eq('id', existingOfferId)
          .eq('pro_id', proId);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { data: proRow } = await supabase.from('service_pros').select('rating').eq('id', proId).maybeSingle();
        const rating = typeof (proRow as { rating?: unknown } | null)?.rating === 'number' ? (proRow as { rating: number }).rating : null;
        const { error: insErr } = await supabase.from('job_offers').insert({
          request_id: requestId,
          pro_id: proId,
          price: p,
          message: message.trim() || null,
          pro_rating_at_offer: rating,
        });
        if (insErr) throw new Error(insErr.message);
      }
      router.push('/pro/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save offer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AppLayout mode="pro">
        <div className="min-h-[40vh] flex items-center justify-center bg-bg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  const photos = Array.isArray(request?.photos) ? (request!.photos as string[]) : [];

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-surface border border-border text-gray-900 dark:text-white"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Request</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Link
            href="/pro/jobs"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back to Jobs
          </Link>

          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading request…</p>
          ) : error && !request ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          ) : request ? (
            <>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{request.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {request.location_zip && (
                    <span className="font-medium text-gray-800 dark:text-gray-200">ZIP {request.location_zip} · </span>
                  )}
                  {request.location}
                </p>
                <p className="text-xs text-gray-500 mt-1 capitalize">Category: {request.service_category.replace(/-/g, ' ')}</p>
                {request.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap">{request.description}</p>
                )}
                {(request.budget_min != null || request.budget_max != null) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Budget:{' '}
                    {request.budget_min != null && request.budget_max != null
                      ? `$${request.budget_min}–$${request.budget_max}`
                      : request.budget_min != null
                        ? `From $${request.budget_min}`
                        : `Up to $${request.budget_max}`}
                  </p>
                )}
                {(request.preferred_date || request.preferred_time) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Preferred:{' '}
                    {request.preferred_date
                      ? new Date(request.preferred_date).toLocaleDateString()
                      : ''}{' '}
                    {request.preferred_time ?? ''}
                  </p>
                )}
                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {photos.slice(0, 6).map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm">
                  {error}
                </div>
              )}

              {request.status === 'open' && new Date(request.expires_at) >= new Date() ? (
                <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-surface border border-border">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {existingOfferId ? 'Update your offer' : 'Send an offer'}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your price ($) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message (optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-[#FFC067] text-black font-semibold hover:opacity-95 disabled:opacity-60"
                  >
                    {submitting ? 'Saving…' : existingOfferId ? 'Update offer' : 'Submit offer'}
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="pro" userName={userName} />
    </AppLayout>
  );
}
