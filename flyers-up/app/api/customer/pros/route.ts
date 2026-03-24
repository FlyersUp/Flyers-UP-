import { NextRequest } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zipcodes = require('zipcodes');

const NO_SHOW_THRESHOLD_URGENT = 2; // repeated no-shows disable same-day/urgent

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/pros?categorySlug=cleaning&zip=10001&radiusMiles=10
 * Returns pros for the category, filtered by zip and radius using actual distance.
 * radiusMiles: 0 = exact zip only, 10/25/50 = zip codes within that many miles.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('categorySlug') ?? '';
  const zip = searchParams.get('zip')?.trim() ?? '';
  const radiusMiles = Math.min(50, Math.max(0, parseInt(searchParams.get('radiusMiles') ?? '0', 10) || 0));
  const availableToday = searchParams.get('availableToday') === '1' || searchParams.get('availableToday') === 'true';

  if (!categorySlug) {
    return Response.json({ ok: false, pros: [], error: 'categorySlug required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: category } = await supabase
    .from('service_categories')
    .select('id, slug, name')
    .eq('slug', categorySlug)
    .eq('is_active_phase1', true)
    .maybeSingle();

  if (!category) {
    return Response.json({ ok: true, pros: [], categoryName: null });
  }

  const limit = 50;

  let query = supabase
    .from('service_pros')
    .select('id, user_id, display_name, bio, category_id, service_area_zip, rating, review_count, starting_price, location, same_day_available')
    .eq('category_id', category.id)
    .eq('available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (availableToday) {
    query = query.eq('same_day_available', true);
  }

  if (zip) {
    if (radiusMiles === 0) {
      query = query.eq('service_area_zip', zip);
    } else if (zip.length >= 5 && zipcodes.lookup(zip)) {
      const zipsInRadius = zipcodes.radius(zip, radiusMiles);
      if (zipsInRadius.length > 0) {
        query = query.in('service_area_zip', zipsInRadius);
      }
    } else if (zip.length >= 3) {
      const prefix = zip.slice(0, 3);
      query = query.ilike('service_area_zip', `${prefix}%`);
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching pros:', error);
    return Response.json({ ok: false, pros: [], error: error.message }, { status: 500 });
  }

  const rawPros = rows ?? [];
  if (rawPros.length === 0) {
    return Response.json({ ok: true, pros: [], categoryName: category.name });
  }

  const admin = createAdminSupabaseClient();
  const proIds = rawPros.map((p: { id: string }) => p.id);
  const { data: reliabilityRows } = await admin
    .from('pro_reliability')
    .select('pro_id, reliability_score, no_show_count_30d, booking_restriction_level')
    .in('pro_id', proIds);
  const relByPro = new Map(
    (reliabilityRows ?? []).map((r: { pro_id: string; reliability_score?: number; no_show_count_30d?: number; booking_restriction_level?: number }) => [
      r.pro_id,
      {
        score: r.reliability_score ?? 100,
        noShowCount: r.no_show_count_30d ?? 0,
        restricted: (r.booking_restriction_level ?? 0) > 0,
      },
    ])
  );

  let filtered = rawPros.filter((p: { id: string }) => {
    const rel = relByPro.get(p.id);
    if (rel?.restricted) return false; // threshold breach: block from search
    if (availableToday && (rel?.noShowCount ?? 0) >= NO_SHOW_THRESHOLD_URGENT) return false; // repeated no-shows disable urgent
    return true;
  });

  const prosWithRel = filtered.map((p: any) => {
    const rel = relByPro.get(p.id);
    const score = rel?.score ?? 100;
    return {
      ...p,
      _reliabilityScore: score,
      _rankScore: (Number(p.rating) ?? 0) * 0.65 + (score / 100) * 0.35,
    };
  });
  prosWithRel.sort((a: { _rankScore: number }, b: { _rankScore: number }) => b._rankScore - a._rankScore);

  const pros = prosWithRel.map((p: any) => ({
    id: p.id,
    userId: p.user_id,
    name: p.display_name ?? 'Pro',
    bio: p.bio ?? '',
    categorySlug: category.slug,
    categoryName: category.name,
    rating: Number(p.rating) ?? 0,
    reviewCount: Number(p.review_count) ?? 0,
    startingPrice: Number(p.starting_price) ?? 0,
    location: p.location || p.service_area_zip || '',
    serviceAreaZip: p.service_area_zip ?? null,
    sameDayAvailable: Boolean(p.same_day_available),
  }));

  return Response.json({ ok: true, pros, categoryName: category.name });
}
