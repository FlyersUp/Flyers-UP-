'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';

export type JobRequest = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  photos: string[];
  status: string;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
  expires_at: string;
};

function RequestCardSkeleton() {
  return (
    <div className="h-[180px] rounded-xl bg-gray-200 animate-pulse border border-black/8" />
  );
}

function RequestCard({
  request,
  isOwn,
  onViewOffers,
}: {
  request: JobRequest;
  isOwn: boolean;
  onViewOffers?: (id: string) => void;
}) {
  const budgetStr =
    request.budget_min != null && request.budget_max != null
      ? `$${request.budget_min}–$${request.budget_max}`
      : request.budget_min != null
        ? `From $${request.budget_min}`
        : request.budget_max != null
          ? `Up to $${request.budget_max}`
          : 'Budget not set';
  const expiresAt = new Date(request.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <article
      className="relative rounded-xl bg-white border border-black/8 p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="w-3 h-3 rounded-full bg-[#8B7355] shadow-sm border-2 border-[#6B5344]" />
      </div>

      <h3 className="font-semibold text-[#111] text-base mb-1 pr-2">{request.title}</h3>
      <p className="text-xs text-black/60 mb-2 flex items-center gap-1">
        <span>{request.location}</span>
      </p>
      {request.description && (
        <p className="text-sm text-black/70 line-clamp-2 mb-2">{request.description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-[#F5F5F5]/60">{request.service_category}</span>
        <span className="text-black/70">{budgetStr}</span>
      </div>
      {request.preferred_date && (
        <p className="text-xs text-black/60 mt-2">
          Preferred: {new Date(request.preferred_date).toLocaleDateString()}
          {request.preferred_time && ` at ${request.preferred_time}`}
        </p>
      )}
      {isExpired && (
        <span className="absolute top-3 right-3 text-xs font-medium text-black/50 bg-black/5 px-2 py-0.5 rounded">
          Expired
        </span>
      )}
      {isOwn && request.status === 'open' && !isExpired && onViewOffers && (
        <button
          type="button"
          onClick={() => onViewOffers(request.id)}
          className="mt-3 w-full py-2 rounded-lg bg-[#B2FBA5] text-black font-semibold text-sm hover:opacity-95 transition-opacity"
        >
          View Offers
        </button>
      )}
    </article>
  );
}

export default function CustomerRequestsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/customer/requests')}`);
        return;
      }
      setUserId(user.id);
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready || !userId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (!error) setRequests((data ?? []).map(normalizeRequest));
      setLoading(false);
    };
    void load();
  }, [ready, userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    const channel = supabase
      .channel('job_requests_customer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_requests', filter: `customer_id=eq.${userId}` },
        (payload) => {
          queueMicrotask(() => {
            if (payload.new) {
              setRequests((prev) => {
                const next = [...prev];
                const idx = next.findIndex((r) => r.id === (payload.new as { id: string }).id);
                const normalized = normalizeRequest(payload.new as Record<string, unknown>);
                if (idx >= 0) next[idx] = normalized;
                else next.unshift(normalized);
                return next;
              });
            }
            if (payload.old) {
              setRequests((prev) => prev.filter((r) => r.id !== (payload.old as { id: string }).id));
            }
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, userId]);

  const handleViewOffers = (requestId: string) => {
    router.push(`/customer/requests/${requestId}/offers`);
  };

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
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-white border border-black/10 text-black/70 hover:bg-[#EBEBEB]"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-[#111]">Demand Board</h1>
            <Link
              href="/customer/requests/new"
              className="rounded-xl px-4 py-2 bg-[#B2FBA5] text-black font-semibold text-sm hover:opacity-95"
            >
              New Request
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <RequestCardSkeleton key={i} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-black/8">
              <p className="text-base font-medium text-[#111]">No requests yet</p>
              <p className="text-sm text-black/60 mt-1">
                Post a job request and pros will send you offers.
              </p>
              <Link
                href="/customer/requests/new"
                className="inline-block mt-4 px-6 py-2 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95"
              >
                Create Request
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  isOwn
                  onViewOffers={handleViewOffers}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="customer" userName={userName} />
    </AppLayout>
  );
}

function normalizeRequest(row: Record<string, unknown>): JobRequest {
  const photos = row.photos as unknown;
  return {
    id: String(row.id),
    customer_id: String(row.customer_id),
    title: String(row.title ?? ''),
    description: row.description != null ? String(row.description) : null,
    service_category: String(row.service_category ?? ''),
    budget_min: row.budget_min != null ? Number(row.budget_min) : null,
    budget_max: row.budget_max != null ? Number(row.budget_max) : null,
    location: String(row.location ?? ''),
    photos: Array.isArray(photos) ? photos.map(String) : [],
    status: String(row.status ?? 'open'),
    preferred_date: row.preferred_date != null ? String(row.preferred_date) : null,
    preferred_time: row.preferred_time != null ? String(row.preferred_time) : null,
    created_at: String(row.created_at ?? ''),
    expires_at: String(row.expires_at ?? ''),
  };
}
