import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/pros?categorySlug=cleaning&zip=10001&radiusMiles=10
 * Returns pros for the category, filtered by zip and optional radius.
 * radiusMiles: 0 = exact zip only, 10/25 = same metro (3-digit prefix), 50 = no zip filter (wider).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('categorySlug') ?? '';
  const zip = searchParams.get('zip')?.trim() ?? '';
  const radiusMiles = Math.min(50, Math.max(0, parseInt(searchParams.get('radiusMiles') ?? '0', 10) || 0));

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

  const limit = radiusMiles === 0 ? 5 : radiusMiles <= 10 ? 10 : radiusMiles <= 25 ? 15 : 20;

  let query = supabase
    .from('service_pros')
    .select('id, user_id, display_name, bio, category_id, service_area_zip, rating, review_count, starting_price, location')
    .eq('category_id', category.id)
    .eq('available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (zip) {
    if (radiusMiles === 0) {
      query = query.eq('service_area_zip', zip);
    } else if (radiusMiles <= 25 && zip.length >= 3) {
      const prefix = zip.slice(0, 3);
      query = query.ilike('service_area_zip', `${prefix}%`);
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching pros:', error);
    return Response.json({ ok: false, pros: [], error: error.message }, { status: 500 });
  }

  const pros = (rows ?? []).map((p: any) => ({
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
  }));

  return Response.json({ ok: true, pros, categoryName: category.name });
}
