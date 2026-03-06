/**
 * Server-side occupation data helpers.
 * Uses Supabase directly. For client components, use /api/occupations.
 */
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export type OccupationRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  featured: boolean;
  created_at?: string;
};

export type OccupationServiceRow = {
  id: string;
  occupation_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export async function getFeaturedOccupations(limit = 5): Promise<OccupationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, slug, icon, featured, created_at')
    .eq('featured', true)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[occupationData] getFeaturedOccupations:', error);
    return [];
  }
  return data ?? [];
}

export async function getAllOccupations(): Promise<OccupationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, slug, icon, featured, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('[occupationData] getAllOccupations:', error);
    return [];
  }
  return data ?? [];
}

export async function getOccupationBySlug(slug: string): Promise<OccupationRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, slug, icon, featured, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[occupationData] getOccupationBySlug:', error);
    return null;
  }
  return data;
}

export async function getServicesByOccupationId(occupationId: string): Promise<OccupationServiceRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupation_services')
    .select('id, occupation_id, name, description, sort_order')
    .eq('occupation_id', occupationId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[occupationData] getServicesByOccupationId:', error);
    return [];
  }
  return data ?? [];
}
