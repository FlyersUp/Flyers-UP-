'use client';

/**
 * Claimed Request Details - shown after pro successfully claims a job
 */
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type RequestRow = {
  id: string;
  service_slug: string;
  borough: string | null;
  neighborhood: string | null;
  final_price_cents: number;
  claimed_at: string;
};

function formatServiceName(slug: string): string {
  return slug.split(/[-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export default function ClaimedRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.requestId as string | undefined;
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent(`/demand/claimed/${requestId}`)}`);
        return;
      }
      const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (!pro) {
        router.replace('/demand');
        return;
      }
      const { data } = await supabase
        .from('demand_requests')
        .select('id, service_slug, borough, neighborhood, final_price_cents, claimed_at')
        .eq('id', requestId)
        .eq('claimed_by_pro_id', pro.id)
        .single();
      setRequest(data as RequestRow | null);
      setLoading(false);
    };
    void load();
  }, [requestId, router]);

  if (loading) {
    return (
      <AppLayout mode="pro">
        <div className="min-h-[40vh] flex items-center justify-center bg-[#F5F5F5]">
          <p className="text-sm text-black/60">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <DashboardCard>
            <div className="p-6 text-center">
              <p className="font-medium text-[#111]">Request not found or not claimed by you.</p>
              <Link href="/demand" className="mt-4 inline-block text-sm text-[#111] hover:underline">
                ← Back to Demand Board
              </Link>
            </div>
          </DashboardCard>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link href="/demand" className="text-sm text-black/60 hover:text-[#111] mb-4 inline-block">
            ← Back to Demand Board
          </Link>
          <DashboardCard>
            <div className="p-6">
              <div className="inline-block px-2 py-1 rounded-full bg-[#B2FBA5]/50 text-sm font-medium text-black/80 mb-4">
                Claimed
              </div>
              <h1 className="text-xl font-semibold text-[#111]">{formatServiceName(request.service_slug)}</h1>
              <div className="mt-2 text-black/60">
                {(request.borough || request.neighborhood) && (
                  <p>{(request.borough ?? '') + ' ' + (request.neighborhood ?? '')}</p>
                )}
                <p className="mt-1 text-lg font-semibold text-[#FFC067]">${request.final_price_cents / 100}</p>
                <p className="text-sm mt-2">
                  Claimed at {new Date(request.claimed_at).toLocaleString()}
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <Link
                  href="/pro/bookings"
                  className="px-4 py-2 rounded-lg bg-[#FFC067] text-black font-semibold text-sm hover:opacity-95"
                >
                  View Bookings
                </Link>
                <Link
                  href="/demand"
                  className="px-4 py-2 rounded-lg border border-black/15 text-black/80 font-semibold text-sm hover:bg-black/5"
                >
                  Back to Board
                </Link>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </AppLayout>
  );
}
