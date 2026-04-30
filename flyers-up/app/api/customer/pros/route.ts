import { NextRequest } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getClosedProfileUserIds } from '@/lib/pro/filter-marketplace-pros';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';
import { fetchAppReviewDemoServicePros, mapDemoProToCustomerApiRow } from '@/lib/appReviewDemoSupply';
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

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  // Apple Review Demo Mode (reviewer@flyersup.app only): ignore ZIP / radius / same-day supply filters.
  const appleReviewDemoPros =
    sessionUser?.email && isAppleAppReviewAccountEmail(sessionUser.email);

  const limit = 50;

  let query = supabase
    .from('service_pros')
    .select('id, user_id, display_name, bio, category_id, service_area_zip, rating, review_count, starting_price, location, same_day_available, identity_verified, jobs_completed')
    .eq('category_id', category.id)
    .eq('available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (availableToday && !appleReviewDemoPros) {
    query = query.eq('same_day_available', true);
  }

  if (zip && !appleReviewDemoPros) {
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

  let rawPros = rows ?? [];
  const admin = createAdminSupabaseClient();

  if (appleReviewDemoPros && rawPros.length === 0) {
    const demos = (await fetchAppReviewDemoServicePros(admin)).filter((p) => p.category_id === category.id);
    rawPros = demos as typeof rawPros;
  }

  if (rawPros.length === 0) {
    return Response.json({ ok: true, pros: [], categoryName: category.name });
  }

  const closedUserIds = await getClosedProfileUserIds(
    admin,
    rawPros.map((p: { user_id: string }) => p.user_id)
  );
  const rawProsOpen = rawPros.filter((p: { user_id: string }) => !closedUserIds.has(p.user_id));
  if (rawProsOpen.length === 0) {
    return Response.json({ ok: true, pros: [], categoryName: category.name });
  }

  const proIds = rawProsOpen.map((p: { id: string }) => p.id);
  const { data: perfRows } = await admin
    .from('pro_performance_snapshot')
    .select('pro_id, avg_response_minutes, avg_rating')
    .in('pro_id', proIds);
  const perfByPro = new Map(
    (perfRows ?? []).map((r: { pro_id: string; avg_response_minutes?: number | null; avg_rating?: number | null }) => [
      r.pro_id,
      {
        avgResponseMinutes: r.avg_response_minutes ?? null,
        avgRating: r.avg_rating ?? null,
      },
    ])
  );
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

  const filtered = rawProsOpen.filter((p: { id: string }) => {
    if (appleReviewDemoPros) return true;
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

  let pros = prosWithRel.map((p: any) => {
    const perf = perfByPro.get(p.id);
    return {
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
      id_verified: Boolean(p.identity_verified ?? false),
      jobs_completed: Number(p.jobs_completed ?? 0),
      avg_response_minutes:
        typeof perf?.avgResponseMinutes === 'number' && Number.isFinite(perf.avgResponseMinutes)
          ? Number(perf.avgResponseMinutes)
          : null,
      avg_rating:
        typeof perf?.avgRating === 'number' && Number.isFinite(perf.avgRating)
          ? Number(perf.avgRating)
          : null,
    };
  });

  if (appleReviewDemoPros) {
    const demos = await fetchAppReviewDemoServicePros(admin);
    const seen = new Set(pros.map((x: { id: string }) => x.id));
    for (const d of demos) {
      if (d.category_id !== category.id || seen.has(d.id)) continue;
      seen.add(d.id);
      pros.push(mapDemoProToCustomerApiRow(d, { slug: category.slug, name: category.name }));
    }
  }

  return Response.json(
    { ok: true, pros, categoryName: category.name },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
