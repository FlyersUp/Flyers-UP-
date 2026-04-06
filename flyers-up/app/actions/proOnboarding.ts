'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { OCCUPATION_TO_SERVICE_SLUG } from '@/lib/occupations';
import type { OccupationServiceRow } from '@/lib/occupationData';

async function replaceProServicesSelectionsForPro(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  proId: string,
  occupationId: string,
  serviceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const uniqueServiceIds = [...new Set(serviceIds)];
  if (uniqueServiceIds.length === 0) {
    return { success: false, error: 'Select at least one service to continue.' };
  }

  const { data: validServices } = await supabase
    .from('occupation_services')
    .select('id')
    .eq('occupation_id', occupationId)
    .eq('is_active', true)
    .in('id', uniqueServiceIds);

  const validIds = new Set((validServices ?? []).map((s: { id: string }) => s.id));
  const invalid = uniqueServiceIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return { success: false, error: 'One or more selected services do not belong to the chosen occupation.' };
  }

  await supabase.from('pro_services').delete().eq('pro_id', proId);

  const toInsert = uniqueServiceIds.map((serviceId) => ({
    pro_id: proId,
    service_id: serviceId,
  }));

  const { error: insertErr } = await supabase.from('pro_services').insert(toInsert);
  if (insertErr) {
    console.error('[proOnboarding] replaceProServicesSelections insert:', insertErr);
    return { success: false, error: insertErr.message };
  }

  return { success: true };
}

export type ProServicesEditorDataResult =
  | { ok: false; reason: 'not_authenticated' | 'not_pro' | 'no_pro_row' | 'no_occupation' }
  | {
      ok: true;
      occupation: {
        id: string;
        name: string;
        slug: string;
        icon: string | null;
        description: string | null;
      };
      services: OccupationServiceRow[];
      selectedServiceIds: string[];
    };

/**
 * Load occupation-linked services and current selections for the signed-in pro (profile services editor).
 */
export async function getMyProServicesEditorDataAction(): Promise<ProServicesEditorDataResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, reason: 'not_authenticated' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'pro') {
    return { ok: false, reason: 'not_pro' };
  }

  const { data: pro } = await supabase
    .from('service_pros')
    .select(
      `
      id,
      occupation_id,
      occupations ( id, name, slug, icon, description )
    `
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (!pro?.id) {
    return { ok: false, reason: 'no_pro_row' };
  }

  const occupationId = (pro as { occupation_id?: string | null }).occupation_id;
  if (!occupationId) {
    return { ok: false, reason: 'no_occupation' };
  }

  const rawOcc = (pro as { occupations?: unknown }).occupations;
  const occ = (Array.isArray(rawOcc) ? rawOcc[0] : rawOcc) as
    | { id: string; name: string; slug: string; icon: string | null; description: string | null }
    | null
    | undefined;
  if (!occ?.id) {
    return { ok: false, reason: 'no_occupation' };
  }

  const { data: svcs } = await supabase
    .from('occupation_services')
    .select('id, occupation_id, slug, name, description, sort_order')
    .eq('occupation_id', occupationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: links } = await supabase.from('pro_services').select('service_id').eq('pro_id', pro.id);

  const selectedServiceIds = [...new Set((links ?? []).map((r: { service_id: string }) => r.service_id))];

  return {
    ok: true,
    occupation: {
      id: occ.id,
      name: occ.name,
      slug: occ.slug,
      icon: occ.icon,
      description: occ.description,
    },
    services: (svcs ?? []) as OccupationServiceRow[],
    selectedServiceIds,
  };
}

/**
 * Replace pro_services for the signed-in pro using their existing occupation only (does not change occupation).
 */
export async function updateProServicesSelectionsAction(
  serviceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const { data: pro } = await supabase
    .from('service_pros')
    .select('id, occupation_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!pro?.id) {
    return { success: false, error: 'Pro profile not found.' };
  }

  const occupationId = (pro as { occupation_id?: string | null }).occupation_id;
  if (!occupationId) {
    return { success: false, error: 'Complete onboarding to set your occupation before editing services.' };
  }

  return replaceProServicesSelectionsForPro(supabase, pro.id, occupationId, serviceIds);
}

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

  const replaced = await replaceProServicesSelectionsForPro(supabase, pro.id, occupationId, serviceIds);
  if (!replaced.success) {
    return replaced;
  }

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
