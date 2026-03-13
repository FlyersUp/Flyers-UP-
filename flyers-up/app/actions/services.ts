'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  getActiveServices,
  getActiveSubcategoriesByServiceSlug,
  getSubcategoriesByOccupationId,
  type Service,
  type ServiceSubcategory,
} from '@/lib/db/services';
import { getMyProSubcategorySelections, setMyProSubcategorySelections } from '@/lib/db/proServices';
import { requireProUser } from '@/app/actions/_auth';
import type { ProSubcategorySelection } from '@/lib/db/proServices';

/** Public: get active services */
export async function getActiveServicesAction(): Promise<Service[]> {
  const supabase = await createServerSupabaseClient();
  return getActiveServices(supabase);
}

/** Public: get category_id for a service slug (for backward compat with service_pros.category_id). */
export async function getCategoryIdForServiceSlugAction(serviceSlug: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', serviceSlug)
    .maybeSingle();
  return data?.id ?? null;
}

/** Public: get active subcategories for a service by slug */
export async function getActiveSubcategoriesByServiceSlugAction(serviceSlug: string): Promise<ServiceSubcategory[]> {
  const supabase = await createServerSupabaseClient();
  return getActiveSubcategoriesByServiceSlug(supabase, serviceSlug);
}

/** Public: get subcategories for an occupation by occupation_id (strict occupation filtering) */
export async function getSubcategoriesByOccupationIdAction(occupationId: string): Promise<ServiceSubcategory[]> {
  const supabase = await createServerSupabaseClient();
  return getSubcategoriesByOccupationId(supabase, occupationId);
}

/** Pro-only: get my subcategory selections grouped by service */
export async function getMyProSubcategorySelectionsAction(): Promise<ProSubcategorySelection[]> {
  const { userId } = await requireProUser();
  const supabase = await createServerSupabaseClient();
  return getMyProSubcategorySelections(supabase, userId);
}

/** Pro-only: set my subcategory selections for a service (replaces existing). Returns category_id for backward compat. */
export async function setMyProSubcategorySelectionsAction(
  serviceSlug: string,
  subcategoryIds: string[],
  occupationId?: string
): Promise<{ success: boolean; error?: string; category_id?: string; selections?: ProSubcategorySelection }> {
  const { userId } = await requireProUser();
  const supabase = await createServerSupabaseClient();
  return setMyProSubcategorySelections(supabase, { userId, serviceSlug, subcategoryIds, occupationId });
}
