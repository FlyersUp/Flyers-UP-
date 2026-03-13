'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { OCCUPATION_TO_SERVICE_SLUG } from '@/lib/occupations';

/** Get services for an occupation (strict: occupation_id only) */
export async function getServicesByOccupationIdAction(occupationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('occupation_services')
    .select('id, occupation_id, slug, name, description, sort_order')
    .eq('occupation_id', occupationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[proOnboarding] getServicesByOccupationId:', error);
    return [];
  }
  return data ?? [];
}

/** Save pro's occupation and service selections. Validates all service_ids belong to occupation_id. */
export async function setProOccupationAndServicesAction(
  occupationId: string,
  serviceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (serviceIds.length === 0) {
    return { success: false, error: 'Select at least one service to continue.' };
  }

  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const { data: pro } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!pro) {
    return { success: false, error: 'Pro profile not found.' };
  }

  // Backend validation: all service_ids must belong to occupation_id
  const { data: validServices } = await supabase
    .from('occupation_services')
    .select('id')
    .eq('occupation_id', occupationId)
    .eq('is_active', true)
    .in('id', serviceIds);

  const validIds = new Set((validServices ?? []).map((s: { id: string }) => s.id));
  const invalid = serviceIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return { success: false, error: 'One or more selected services do not belong to the chosen occupation.' };
  }

  // Delete existing pro_services for this pro
  await supabase.from('pro_services').delete().eq('pro_id', pro.id);

  // Insert new selections
  const toInsert = serviceIds.map((serviceId) => ({
    pro_id: pro.id,
    service_id: serviceId,
  }));

  const { error: insertErr } = await supabase.from('pro_services').insert(toInsert);
  if (insertErr) {
    console.error('[proOnboarding] setProOccupationAndServices insert:', insertErr);
    return { success: false, error: insertErr.message };
  }

  // Update service_pros.occupation_id
  await supabase.from('service_pros').update({ occupation_id: occupationId }).eq('id', pro.id);

  return { success: true };
}

/** Get category_id for legacy service_pros (maps occupation slug to service_categories) */
export async function getCategoryIdForOccupationSlugAction(occupationSlug: string): Promise<string | null> {
  const serviceSlug = OCCUPATION_TO_SERVICE_SLUG[occupationSlug];
  if (!serviceSlug) return null;

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', serviceSlug)
    .maybeSingle();
  return data?.id ?? null;
}
