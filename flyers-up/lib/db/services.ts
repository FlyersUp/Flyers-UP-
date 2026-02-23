/**
 * Server-side data access for main services and subcategories.
 * Use createServerSupabaseClient or createAdminSupabaseClient.
 */

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceSubcategory {
  id: string;
  service_id: string;
  slug: string;
  name: string;
  description: string | null;
  requires_license: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MarketplacePro {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  rating: number;
  review_count: number;
  starting_price: number;
  location: string | null;
  logo_url: string | null;
  business_hours: string | null;
  service_radius: number | null;
  category_slug: string;
  category_name: string;
}

/** Create a Supabase client - pass from route/action. */
type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabaseServer').createServerSupabaseClient>>;

/**
 * Get all active services, sorted by sort_order.
 */
export async function getActiveServices(supabase: SupabaseClient): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, slug, name, description, sort_order, is_active, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getActiveServices error:', error);
    return [];
  }
  return (data ?? []) as Service[];
}

/**
 * Get active subcategories for a service by slug, sorted.
 */
export async function getActiveSubcategoriesByServiceSlug(
  supabase: SupabaseClient,
  serviceSlug: string
): Promise<ServiceSubcategory[]> {
  const { data: service } = await supabase
    .from('services')
    .select('id')
    .eq('slug', serviceSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!service) return [];

  const { data, error } = await supabase
    .from('service_subcategories')
    .select('id, service_id, slug, name, description, requires_license, sort_order, is_active, created_at')
    .eq('service_id', service.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getActiveSubcategoriesByServiceSlug error:', error);
    return [];
  }
  return (data ?? []) as ServiceSubcategory[];
}

/**
 * Get marketplace pros for a main service, optionally filtered by subcategory.
 * - If subcategorySlug is provided: only pros who offer that subcategory (via pro_service_subcategories join).
 * - Otherwise: pros who offer any subcategory under the service (or have primary_service_id / category_id matching).
 *
 * Query joins: service_pros → pro_service_subcategories → service_subcategories → services
 * Filters: services.slug, service_subcategories.slug (optional), is_active = true
 *
 * Example:
 *   getMarketplacePros(supabase, { serviceSlug: 'photography', subcategorySlug: 'wedding-photography' })
 *   getMarketplacePros(supabase, { serviceSlug: 'pet-care', subcategorySlug: '30-min-walk' })
 */
export async function getMarketplacePros(
  supabase: SupabaseClient,
  params: { serviceSlug: string; subcategorySlug?: string; limit?: number }
): Promise<MarketplacePro[]> {
  const limit = params.limit ?? 50;

  // Resolve service and optionally subcategory
  const { data: service } = await supabase
    .from('services')
    .select('id, slug, name')
    .eq('slug', params.serviceSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!service) return [];

  let subcategoryId: string | null = null;
  if (params.subcategorySlug) {
    const { data: sub } = await supabase
      .from('service_subcategories')
      .select('id')
      .eq('service_id', service.id)
      .eq('slug', params.subcategorySlug)
      .eq('is_active', true)
      .maybeSingle();
    subcategoryId = sub?.id ?? null;
  }

  // Map service slug to service_categories for backward compat (pros with category_id)
  const { data: legacyCat } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', params.serviceSlug)
    .maybeSingle();

  const legacyCategoryId = legacyCat?.id ?? null;

  if (subcategoryId) {
    // Filter by subcategory: pros in pro_service_subcategories for this subcategory
    const { data: proIds } = await supabase
      .from('pro_service_subcategories')
      .select('pro_id')
      .eq('subcategory_id', subcategoryId);

    const ids = [...new Set((proIds ?? []).map((r: { pro_id: string }) => r.pro_id))];
    if (ids.length === 0) return [];

    const { data: pros, error } = await supabase
      .from('service_pros')
      .select('id, user_id, display_name, bio, rating, review_count, starting_price, location, logo_url, business_hours, service_radius')
      .in('id', ids)
      .eq('available', true)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getMarketplacePros error:', error);
      return [];
    }

    return (pros ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name ?? 'Pro',
      bio: p.bio ?? null,
      rating: Number(p.rating) ?? 0,
      review_count: Number(p.review_count) ?? 0,
      starting_price: Number(p.starting_price) ?? 0,
      location: p.location ?? null,
      logo_url: p.logo_url ?? null,
      business_hours: p.business_hours ?? null,
      service_radius: p.service_radius ?? null,
      category_slug: service.slug,
      category_name: service.name,
    })) as MarketplacePro[];
  }

  // No subcategory: pros with primary_service_id = service OR category_id = legacy
  const orParts = [`primary_service_id.eq.${service.id}`];
  if (legacyCategoryId) orParts.push(`category_id.eq.${legacyCategoryId}`);
  const orFilter = orParts.join(',');

  const { data: prosData, error: prosError } = await supabase
    .from('service_pros')
    .select('id, user_id, display_name, bio, rating, review_count, starting_price, location, logo_url, business_hours, service_radius')
    .or(orFilter)
    .eq('available', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (prosError) {
    console.error('getMarketplacePros error:', prosError);
    return [];
  }

  return (prosData ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    user_id: p.user_id,
    display_name: p.display_name ?? 'Pro',
    bio: p.bio ?? null,
    rating: Number(p.rating) ?? 0,
    review_count: Number(p.review_count) ?? 0,
    starting_price: Number(p.starting_price) ?? 0,
    location: p.location ?? null,
    logo_url: p.logo_url ?? null,
    business_hours: p.business_hours ?? null,
    service_radius: p.service_radius ?? null,
    category_slug: service.slug,
    category_name: service.name,
  })) as MarketplacePro[];
}
