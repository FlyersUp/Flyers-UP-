/**
 * Server-side data access for pro service/subcategory selections.
 * Requires authenticated user; pro ownership enforced via RLS.
 */

export interface ProSubcategorySelection {
  service_slug: string;
  service_name: string;
  subcategory_ids: string[];
  subcategories: { id: string; slug: string; name: string }[];
}

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabaseServer').createServerSupabaseClient>>;

/**
 * Get the current pro's subcategory selections, grouped by service.
 * Returns empty if not a pro or no selections.
 */
export async function getMyProSubcategorySelections(
  supabase: SupabaseClient,
  userId: string
): Promise<ProSubcategorySelection[]> {
  const { data: pro } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!pro) return [];

  const { data: selections } = await supabase
    .from('pro_service_subcategories')
    .select('subcategory_id')
    .eq('pro_id', pro.id);

  const subIds = [...new Set((selections ?? []).map((r: { subcategory_id: string }) => r.subcategory_id))];
  if (subIds.length === 0) return [];

  const { data: subs } = await supabase
    .from('service_subcategories')
    .select('id, slug, name, service_id')
    .in('id', subIds)
    .eq('is_active', true);

  const { data: services } = await supabase
    .from('services')
    .select('id, slug, name')
    .in('id', [...new Set((subs ?? []).map((s: { service_id: string }) => s.service_id))])
    .eq('is_active', true);

  const serviceById = new Map((services ?? []).map((s: { id: string; slug: string; name: string }) => [s.id, s]));
  const subsByService = new Map<string, { id: string; slug: string; name: string }[]>();

  for (const sub of subs ?? []) {
    const s = sub as { id: string; slug: string; name: string; service_id: string };
    const arr = subsByService.get(s.service_id) ?? [];
    arr.push({ id: s.id, slug: s.slug, name: s.name });
    subsByService.set(s.service_id, arr);
  }

  const result: ProSubcategorySelection[] = [];
  for (const [serviceId, items] of subsByService) {
    const svc = serviceById.get(serviceId);
    if (!svc) continue;
    result.push({
      service_slug: svc.slug,
      service_name: svc.name,
      subcategory_ids: items.map((i) => i.id),
      subcategories: items,
    });
  }
  return result;
}

/**
 * Set the pro's subcategory selections for a given service.
 * Replaces existing selections for that service (delete + insert).
 * Validates that subcategoryIds belong to the service and are active.
 * Also updates service_pros.primary_service_id and category_id for backward compat.
 */
export async function setMyProSubcategorySelections(
  supabase: SupabaseClient,
  params: { userId: string; serviceSlug: string; subcategoryIds: string[] }
): Promise<{ success: boolean; error?: string; selections?: ProSubcategorySelection }> {
  if (params.subcategoryIds.length === 0) {
    return { success: false, error: 'At least one subcategory is required.' };
  }

  const { data: pro } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', params.userId)
    .maybeSingle();

  if (!pro) {
    return { success: false, error: 'Pro profile not found.' };
  }

  const { data: service } = await supabase
    .from('services')
    .select('id, slug, name')
    .eq('slug', params.serviceSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!service) {
    return { success: false, error: 'Service not found or inactive.' };
  }

  // Validate all subcategoryIds belong to this service and are active
  const { data: validSubs } = await supabase
    .from('service_subcategories')
    .select('id')
    .eq('service_id', service.id)
    .eq('is_active', true)
    .in('id', params.subcategoryIds);

  const validIds = new Set((validSubs ?? []).map((s: { id: string }) => s.id));
  const invalid = params.subcategoryIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return { success: false, error: 'One or more subcategories are invalid or inactive.' };
  }

  // Delete existing selections for this service
  const { data: existingSubs } = await supabase
    .from('service_subcategories')
    .select('id')
    .eq('service_id', service.id);

  const existingIds = (existingSubs ?? []).map((s: { id: string }) => s.id);
  if (existingIds.length > 0) {
    await supabase
      .from('pro_service_subcategories')
      .delete()
      .eq('pro_id', pro.id)
      .in('subcategory_id', existingIds);
  }

  // Insert new selections
  const toInsert = params.subcategoryIds.map((subcategoryId) => ({
    pro_id: pro.id,
    subcategory_id: subcategoryId,
  }));

  const { error: insertErr } = await supabase.from('pro_service_subcategories').insert(toInsert);
  if (insertErr) {
    console.error('setMyProSubcategorySelections insert error:', insertErr);
    return { success: false, error: insertErr.message };
  }

  // Update service_pros.primary_service_id and category_id for backward compat
  const { data: legacyCat } = await supabase
    .from('service_categories')
    .select('id')
    .eq('slug', params.serviceSlug)
    .maybeSingle();

  const categoryId = legacyCat?.id ?? null;
  const updatePayload: Record<string, unknown> = {
    primary_service_id: service.id,
  };
  if (categoryId) updatePayload.category_id = categoryId;

  await supabase.from('service_pros').update(updatePayload).eq('id', pro.id);

  // Fetch updated selections
  const [group] = await getMyProSubcategorySelections(supabase, params.userId);
  return {
    success: true,
    category_id: categoryId ?? undefined,
    selections: group ?? {
      service_slug: params.serviceSlug,
      service_name: service.name,
      subcategory_ids: params.subcategoryIds,
      subcategories: [], // Will be populated by caller if needed
    },
  };
}
