'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';

type JobRequestRow = {
  id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  status: string;
  preferred_date: string | null;
  preferred_time: string | null;
  expires_at: string;
  created_at: string;
};

type ProRequestCardProps = {
  request: JobRequestRow;
  proId: string;
  onOfferSent: () => void;
};

function ProRequestCardSkeleton() {
  return (
    <div className="h-[200px] rounded-xl bg-[#F2F2F0]/80 animate-pulse border border-black/8" />
  );
}

function ProRequestCard({ request, proId, onOfferSent }: ProRequestCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ignored, setIgnored] = useState(false);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);

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

  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) return;
    setSending(true);
    try {
      const { error } = await supabase.from('job_offers').insert({
        request_id: request.id,
        pro_id: proId,
        price: parseFloat(price),
        message: message.trim() || null,
      });
      if (!error) {
        setSent(true);
        setShowOfferForm(false);
        onOfferSent();
      }
    } finally {
      setSending(false);
    }
  }

  if (ignored) return null;

  return (
    <article
      className="relative rounded-xl bg-[#F2F2F0] border border-black/8 p-4 shadow-sm transition-all duration-300 hover:shadow-md"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="w-3 h-3 rounded-full bg-[#8B7355] shadow-sm border-2 border-[#6B5344]" />
      </div>

      <h3 className="font-semibold text-[#111] text-base mb-1">{request.title}</h3>
      <p className="text-xs text-black/60 mb-2">{request.location}</p>
      {request.description && (
        <p className="text-sm text-black/70 line-clamp-2 mb-2">{request.description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <span className="px-2 py-0.5 rounded-full bg-[#D9D5D2]/60">{request.service_category}</span>
        <span className="text-black/70 font-medium">Budget: {budgetStr}</span>
      </div>
      {request.preferred_date && (
        <p className="text-xs text-black/60 mb-3">
          Preferred: {new Date(request.preferred_date).toLocaleDateString()}
          {request.preferred_time && ` • ${request.preferred_time}`}
        </p>
      )}
      {isExpired && (
        <span className="absolute top-3 right-3 text-xs font-medium text-black/50 bg-black/5 px-2 py-0.5 rounded">
          Expired
        </span>
      )}

      {!isExpired && !sent && (
        <div className="flex flex-wrap gap-2">
          {!showOfferForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowOfferForm(true)}
                className="px-4 py-2 rounded-lg bg-[#FFC067] text-black font-semibold text-sm hover:opacity-95 transition-opacity"
              >
                Send Offer
              </button>
              <Link
                href={`/pro/messages?request=${request.id}`}
                className="px-4 py-2 rounded-lg border border-black/15 text-black/80 font-semibold text-sm hover:bg-black/5 transition-colors"
              >
                Message
              </Link>
              <button
                type="button"
                onClick={() => setIgnored(true)}
                className="px-4 py-2 rounded-lg text-black/50 text-sm hover:text-black/70 transition-colors"
              >
                Ignore
              </button>
            </>
          ) : (
            <form onSubmit={handleSendOffer} className="w-full space-y-2 pt-2 border-t border-black/10">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Your price ($)"
                className="w-full px-3 py-2 rounded-lg bg-white/80 border border-black/10 text-sm"
                required
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message to customer"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/80 border border-black/10 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded-lg bg-[#FFC067] text-black font-semibold text-sm hover:opacity-95 disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Submit Offer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfferForm(false)}
                  className="px-4 py-2 rounded-lg text-black/60 text-sm hover:text-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {sent && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#B2FBA5]/50 text-sm font-medium text-black/80">
          Offer sent
        </div>
      )}
    </article>
  );
}

export default function ProRequestsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JobRequestRow[]>([]);
  const [proId, setProId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/pro/requests')}`);
        return;
      }
      setUserName(user.email?.split('@')[0] ?? 'Account');

      const { data: pro } = await supabase
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!pro) {
        router.replace('/pro');
        return;
      }
      setProId(pro.id);
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('job_requests')
        .select('id, title, description, service_category, budget_min, budget_max, location, status, preferred_date, preferred_time, expires_at, created_at')
        .eq('status', 'open')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!error) setRequests((data ?? []) as JobRequestRow[]);
      setLoading(false);
    };
    void load();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const channel = supabase
      .channel('job_requests_pro')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_requests' },
        () => {
          supabase
            .from('job_requests')
            .select('id, title, description, service_category, budget_min, budget_max, location, status, preferred_date, preferred_time, expires_at, created_at')
            .eq('status', 'open')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setRequests(data as JobRequestRow[]);
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready]);

  const handleOfferSent = () => {
    setRequests((prev) => prev.filter((r) => requests.some((x) => x.id === r.id)));
  };

  if (!ready || !proId) {
    return (
      <AppLayout mode="pro">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-[#D9D5D2]">
        <div className="sticky top-0 z-20 bg-[#D9D5D2]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-[#F2F2F0] border border-black/10 text-black/70 hover:bg-[#F2F2F0]/90"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-[#111]">Demand Board</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-black/60 mb-4">
            Customer job requests near you. Send offers to win jobs.
          </p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProRequestCardSkeleton key={i} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-[#F2F2F0] rounded-xl p-8 text-center border border-black/8">
              <p className="text-base font-medium text-[#111]">No open requests</p>
              <p className="text-sm text-black/60 mt-1">
                New requests will appear here. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requests.map((r) => (
                <ProRequestCard
                  key={r.id}
                  request={r}
                  proId={proId}
                  onOfferSent={handleOfferSent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="pro" userName={userName} />
    </AppLayout>
  );
}
