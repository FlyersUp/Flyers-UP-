import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Map marketplace `services.slug` (e.g. pet-care) to canonical `occupations.slug` (e.g. dog-walker)
 * using the first occupation-scoped subcategory on that service.
 */
export async function resolveOccupationSlugFromServiceSlug(
  supabase: SupabaseClient,
  serviceSlug: string
): Promise<string | null> {
  const slug = serviceSlug.trim();
  if (!slug) return null;

  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (svcErr || !service?.id) return null;

  const { data: sub, error: subErr } = await supabase
    .from('service_subcategories')
    .select('occupation_id')
    .eq('service_id', service.id)
    .not('occupation_id', 'is', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (subErr || !sub?.occupation_id) return null;

  const { data: occ, error: occErr } = await supabase
    .from('occupations')
    .select('slug')
    .eq('id', sub.occupation_id)
    .maybeSingle();

  if (occErr || !occ || typeof (occ as { slug?: string }).slug !== 'string') return null;
  const out = String((occ as { slug: string }).slug).trim();
  return out || null;
}
