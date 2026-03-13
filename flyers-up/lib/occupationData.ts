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
  description: string | null;
  sort_order: number;
  is_active: boolean;
  category_id?: string | null;
  created_at?: string;
};

export type OccupationServiceRow = {
  id: string;
  occupation_id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export async function getFeaturedOccupations(limit = 5): Promise<OccupationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, slug, icon, description, sort_order, is_active, category_id, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
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
    .select('id, name, slug, icon, description, sort_order, is_active, category_id, featured, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

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
    .select('id, name, slug, icon, description, sort_order, is_active, category_id, created_at')
    .eq('slug', slug)
    .eq('is_active', true)
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
    .select('id, occupation_id, slug, name, description, sort_order')
    .eq('occupation_id', occupationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[occupationData] getServicesByOccupationId:', error);
    return [];
  }
  return data ?? [];
}
