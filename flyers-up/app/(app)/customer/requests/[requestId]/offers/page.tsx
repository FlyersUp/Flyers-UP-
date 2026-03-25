'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser, createBooking } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { scheduleRemoveSupabaseChannel } from '@/lib/supabaseChannelCleanup';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SideMenu } from '@/components/ui/SideMenu';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';

type JobOffer = {
  id: string;
  request_id: string;
  pro_id: string;
  price: number;
  message: string | null;
  created_at: string;
  pro?: {
    id: string;
    display_name: string | null;
    rating: number | null;
    review_count: number | null;
    location: string | null;
  };
  photoUrl?: string | null;
};

type JobRequest = {
  id: string;
  title: string;
  description: string | null;
  location: string;
  preferred_date: string | null;
  preferred_time: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  job_details?: Record<string, unknown>;
  photos?: string[];
  photos_categorized?: Array<{ category: string; url: string }>;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function RequestOffersPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.requestId as string | undefined;
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<JobRequest | null>(null);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [selectingProId, setSelectingProId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent(`/customer/requests/${requestId}/offers`)}`);
        return;
      }
      setUserId(user.id);
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router, requestId]);

  useEffect(() => {
    if (!ready || !requestId) return;

    const load = async () => {
      const { data: reqData } = await supabase
        .from('job_requests')
        .select('id, title, description, location, preferred_date, preferred_time, budget_min, budget_max, job_details, photos, photos_categorized')
        .eq('id', requestId)
        .single();

      if (reqData) {
        setRequest(reqData as JobRequest);
      }

      const { data: offersData } = await supabase
        .from('job_offers')
        .select('id, request_id, pro_id, price, message, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (offersData && offersData.length > 0) {
        const proIds = [...new Set(offersData.map((o) => o.pro_id))];
        const { data: prosData } = await supabase
          .from('service_pros')
          .select('id, display_name, rating, review_count, location')
          .in('id', proIds);
        const proMap = new Map((prosData ?? []).map((p) => [p.id, p]));
        const offersList = offersData.map((o) => {
          const pro = proMap.get(o.pro_id);
          return {
            ...o,
            pro: pro
              ? {
                  id: pro.id,
                  display_name: pro.display_name,
                  rating: pro.rating,
                  review_count: pro.review_count,
                  location: pro.location,
                }
              : undefined,
            photoUrl: null as string | null,
          };
        });
        setOffers(offersList as JobOffer[]);
      }
      setLoading(false);
    };
    void load();
  }, [ready, requestId]);

  useEffect(() => {
    if (!ready || !requestId) return;
    const channel = supabase
      .channel(`job_offers_${requestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_offers', filter: `request_id=eq.${requestId}` },
        (payload) => {
          queueMicrotask(() => {
            if (payload.new) {
              const newOffer = payload.new as JobOffer & { pro?: unknown };
              setOffers((prev) => [newOffer, ...prev]);
            }
          });
        }
      )
      .subscribe();
    return () => {
      scheduleRemoveSupabaseChannel(supabase, channel);
    };
  }, [ready, requestId]);

  async function handleSelectPro(offerId: string, proId: string, price: number) {
    if (!userId || !request) return;
    setError(null);
    setSelectingProId(proId);
    try {
      const serviceDate =
        request.preferred_date || todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
      const serviceTime = request.preferred_time || '14:00';
      const address = request.location;
      const notes = [request.title, request.description].filter(Boolean).join('\n\n');

      const customerBudget = request.budget_max ?? request.budget_min ?? undefined;
      const reqData = request as { job_details?: Record<string, unknown>; photos?: string[]; photos_categorized?: Array<{ category: string; url: string }> };
      const jobDetailsSnapshot = reqData.job_details ?? undefined;
      const photosSnapshot = (reqData.photos_categorized && reqData.photos_categorized.length > 0)
        ? reqData.photos_categorized
        : (reqData.photos ?? []).map((url) => ({ category: 'main_room' as const, url }));

      const booking = await createBooking({
        customerId: userId,
        proId,
        date: serviceDate,
        time: serviceTime,
        address,
        notes,
        customerBudget,
        price,
        jobRequestId: requestId,
        jobOfferId: offerId,
        jobDetailsSnapshot,
        photosSnapshot,
      });

      if (booking?.id) {
        await supabase
          .from('job_requests')
          .update({ status: 'in_progress', selected_offer_id: offerId, booking_id: booking.id })
          .eq('id', requestId);
      } else {
        await supabase
          .from('job_requests')
          .update({ status: 'in_progress' })
          .eq('id', requestId);
      }

      router.push(`/customer/bookings/${booking?.id}/scope-lock`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking.');
    } finally {
      setSelectingProId(null);
    }
  }

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
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/customer/requests"
              className="text-sm font-medium text-black/70 hover:text-black"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-[#111]">Offers</h1>
            <div className="w-14" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {request && (
            <div className="mb-6 p-4 rounded-xl bg-white border border-black/8">
              <h2 className="font-semibold text-[#111]">{request.title}</h2>
              <p className="text-sm text-black/60 mt-1">{request.location}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-black/8">
              <p className="text-base font-medium text-[#111]">No offers yet</p>
              <p className="text-sm text-black/60 mt-1">
                Pros will send offers soon. Check back in a few minutes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-xl bg-white border border-black/8 p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#F5F5F5]/50 shrink-0">
                      {offer.photoUrl ? (
                        <Image
                          src={offer.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-black/50">
                          {getInitials(offer.pro?.display_name ?? 'Pro')}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#111]">
                        {offer.pro?.display_name ?? 'Pro'}
                      </h3>
                      {offer.pro?.rating != null && (
                        <p className="text-sm text-black/60">
                          ⭐ {offer.pro.rating.toFixed(1)}
                          {offer.pro.review_count != null && ` (${offer.pro.review_count})`}
                        </p>
                      )}
                      <p className="text-lg font-bold text-[#111] mt-1">${offer.price}</p>
                      {offer.message && (
                        <p className="text-sm text-black/70 mt-2">{offer.message}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectPro(offer.id, offer.pro_id, offer.price)}
                        disabled={!!selectingProId}
                        className="mt-3 px-4 py-2 rounded-lg bg-[#B2FBA5] text-black font-semibold text-sm hover:opacity-95 disabled:opacity-60 transition-opacity"
                      >
                        {selectingProId === offer.pro_id ? 'Creating…' : 'Select Pro'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="customer" userName={userName} />
    </AppLayout>
  );
}
