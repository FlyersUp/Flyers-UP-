/**
 * Apple Review Demo Mode (reviewer@flyersup.app only)
 * Demo service pros live in the DB (seeded); this module loads them for API merge / injection.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplacePro } from '@/lib/db/services';

/** Profiles created by scripts/seed-apple-app-review-account.ts for demo supply. */
export const APP_REVIEW_DEMO_PRO_EMAIL_PATTERN = 'flyersup-review-demo-%';

export type DemoServiceProRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  category_id: string;
  primary_service_id: string | null;
  service_area_zip: string | null;
  rating: number | null;
  review_count: number | null;
  starting_price: number | null;
  location: string | null;
  same_day_available: boolean | null;
  identity_verified: boolean | null;
  jobs_completed: number | null;
};

export type CustomerProApiRow = {
  id: string;
  userId: string;
  name: string;
  bio: string;
  categorySlug: string;
  categoryName: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  location: string;
  serviceAreaZip: string | null;
  sameDayAvailable: boolean;
  id_verified: boolean;
  jobs_completed: number;
  avg_response_minutes: number | null;
  avg_rating: number | null;
};

/** Load demo pros (any category); caller filters by service / legacy category. */
export async function fetchAppReviewDemoServicePros(admin: SupabaseClient): Promise<DemoServiceProRow[]> {
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', APP_REVIEW_DEMO_PRO_EMAIL_PATTERN);
  if (pErr || !profiles?.length) return [];
  const userIds = profiles.map((p: { id: string }) => p.id).filter(Boolean);
  if (userIds.length === 0) return [];

  const { data: pros, error } = await admin
    .from('service_pros')
    .select(
      'id, user_id, display_name, bio, category_id, primary_service_id, service_area_zip, rating, review_count, starting_price, location, same_day_available, identity_verified, jobs_completed'
    )
    .in('user_id', userIds)
    .eq('available', true);
  if (error || !pros?.length) return [];
  return pros as DemoServiceProRow[];
}

export function mapDemoProToCustomerApiRow(p: DemoServiceProRow, category: { slug: string; name: string }): CustomerProApiRow {
  return {
    id: p.id,
    userId: p.user_id,
    name: p.display_name ?? 'Demo Pro',
    bio: p.bio ?? '',
    categorySlug: category.slug,
    categoryName: category.name,
    rating: Number(p.rating) ?? 4.8,
    reviewCount: Number(p.review_count) ?? 0,
    startingPrice: Number(p.starting_price) ?? 0,
    location: p.location || p.service_area_zip || 'Demo area',
    serviceAreaZip: p.service_area_zip ?? null,
    sameDayAvailable: true,
    id_verified: Boolean(p.identity_verified),
    jobs_completed: Number(p.jobs_completed ?? 28),
    avg_response_minutes: 12,
    avg_rating: Number(p.rating) ?? 4.8,
  };
}

/** Append seeded demo pros that match the marketplace service (deduped by id). */
export async function mergeMarketplaceProsForAppleReview(
  admin: SupabaseClient,
  serviceSlug: string,
  existing: MarketplacePro[]
): Promise<MarketplacePro[]> {
  const { data: service } = await admin
    .from('services')
    .select('id, slug, name')
    .eq('slug', serviceSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!service?.id) return existing;

  const { data: legacyCat } = await admin.from('service_categories').select('id').eq('slug', serviceSlug).maybeSingle();
  const legacyId = legacyCat?.id ?? null;

  const demos = await fetchAppReviewDemoServicePros(admin);
  const out = [...existing];
  const seen = new Set(existing.map((p) => p.id));

  for (const raw of demos) {
    const matchPrimary = raw.primary_service_id === service.id;
    const matchLegacy = legacyId != null && raw.category_id === legacyId;
    if (!matchPrimary && !matchLegacy) continue;
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    out.push({
      id: raw.id,
      user_id: raw.user_id,
      display_name: raw.display_name ?? 'Demo Pro',
      bio: raw.bio ?? null,
      rating: Number(raw.rating) ?? 4.8,
      review_count: Number(raw.review_count) ?? 0,
      starting_price: Number(raw.starting_price) ?? 0,
      location: raw.location ?? raw.service_area_zip ?? 'Demo area',
      logo_url: null,
      profile_photo_url: null,
      business_hours: 'Demo — always available',
      service_radius: 50,
      category_slug: String(service.slug),
      category_name: String(service.name),
      id_verified: Boolean(raw.identity_verified),
      jobs_completed: Number(raw.jobs_completed ?? 28),
      avg_response_minutes: 12,
      avg_rating: Number(raw.rating) ?? 4.8,
    });
  }
  return out;
}
