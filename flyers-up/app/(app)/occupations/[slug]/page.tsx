'use client';

/**
 * Occupation page: header, service chips, Flyer Wall of pros
 */
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser, getProsByCategory } from '@/lib/api';
import { OCCUPATION_TO_SERVICE_SLUG } from '@/lib/occupations';
import { getOccupationIcon } from '@/lib/occupationIcons';
import { BulletinFlyerCard } from '@/components/flyers/BulletinFlyerCard';
import type { BulletinFlyerPro } from '@/components/flyers/BulletinFlyerCard';
import { ServiceChips } from '@/components/occupations/ServiceChips';

type Occupation = { id: string; name: string; slug: string; icon: string | null };
type OccupationService = { id: string; name: string; description: string | null };

function getRotation(index: number): number {
  const rotations = [1, -1.5, 0.5, -1, 1.2, -0.8, 1.5, -0.5];
  return rotations[index % rotations.length];
}

export default function OccupationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const [services, setServices] = useState<OccupationService[]>([]);
  const [pros, setPros] = useState<BulletinFlyerPro[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [occRes, prosData] = await Promise.all([
          fetch(`/api/occupations/${slug}`, { cache: 'no-store' }),
          (async () => {
            const user = await getCurrentUser();
            if (!user) return [];
            const serviceSlug = OCCUPATION_TO_SERVICE_SLUG[slug];
            if (!serviceSlug) return [];
            return getProsByCategory(serviceSlug, { phase1Only: false });
          })(),
        ]);

        const occJson = await occRes.json();
        if (occRes.ok && occJson.occupation) {
          setOccupation(occJson.occupation);
          setServices(occJson.services ?? []);
        }

        setPros(
          prosData.map((p) => ({
            id: p.id,
            displayName: p.name,
            photoUrl: p.profilePhotoUrl ?? p.logoUrl ?? null,
            primaryCategory: p.categoryName,
            rating: p.rating,
            reviewsCount: p.reviewCount,
            idVerified: p.idVerified,
            jobsCompleted: p.jobsCompleted,
            avgResponseMinutes: p.avgResponseMinutes,
            avgRating: p.avgRating,
            availability: p.businessHours?.trim() || null,
            location: p.location ?? null,
            startingPrice: p.startingPrice,
          }))
        );
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  const IconComponent = occupation ? getOccupationIcon(occupation.slug) : null;

  if (loading) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
          <p className="text-zinc-500">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!occupation) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-4">
          <p className="text-zinc-500 mb-4">Occupation not found.</p>
          <Link href="/occupations" className="text-zinc-900 hover:underline font-medium">
            ← Back to occupations
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[#F5F5F5] border-b border-black/5 pb-4 pt-2">
          <div className="max-w-6xl mx-auto px-4">
            <Link
              href="/occupations"
              className="text-sm text-zinc-500 hover:text-zinc-900 mb-3 inline-block"
            >
              ← All occupations
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
                {IconComponent && <IconComponent className="w-6 h-6 text-zinc-700" strokeWidth={1.5} />}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900">{occupation.name}</h1>
                <p className="text-sm text-zinc-500">Pros near you</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Service chips */}
          {services.length > 0 && (
            <section className="mb-8">
              <div className="mb-3">
                <span className="text-sm font-medium text-zinc-700">Services</span>
              </div>
              <ServiceChips
                services={services.map((s) => ({ id: s.id, name: s.name }))}
                selectedServiceId={selectedServiceId}
                onSelect={setSelectedServiceId}
              />
            </section>
          )}

          {/* Flyer Wall of pros */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
              Pros in {occupation.name}
            </h2>
            {pros.length === 0 ? (
              <div className="rounded-2xl bg-white border border-black/5 p-8 text-center shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
                <p className="text-base font-medium text-zinc-900 mb-6">
                  No pros yet — invite someone
                </p>
                <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                  Be the first to find a pro in this occupation. Know someone great? Invite them to join Flyers Up.
                </p>
                <Link
                  href="mailto:hello@flyersup.com?subject=Invite%20a%20Pro"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white border border-black/10 text-zinc-900 font-medium hover:border-black/20 transition-colors"
                >
                  Invite a Pro
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center">
                {pros.map((pro, i) => (
                  <BulletinFlyerCard
                    key={pro.id}
                    pro={pro}
                    profileHref={`/customer/pros/${pro.id}`}
                    rotation={getRotation(i)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
