'use server';

/**
 * Server Actions for Add-Ons
 *
 * IMPORTANT:
 * - Uses the Service Role key server-side to bypass RLS safely.
 * - Still enforces that the caller is an authenticated pro.
 * - service_category: legacy. When occupationSlug is passed, maps to category via OCCUPATION_TO_SERVICE_SLUG.
 */

import { dollarsToCents } from '@/lib/utils/money';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProUser } from '@/app/actions/_auth';
import { OCCUPATION_TO_SERVICE_SLUG } from '@/lib/occupations';

/** Resolve category slug from occupation slug or category slug. */
async function resolveCategorySlug(
  admin: ReturnType<typeof import('@/lib/supabaseServer').createAdminSupabaseClient>,
  userId: string,
  serviceCategory?: string,
  occupationSlug?: string
): Promise<string | null> {
  // 1) Prefer explicit service category
  const cat = (serviceCategory || '').trim();
  if (cat) return cat;

  // 2) Map occupation slug to category slug
  if (occupationSlug?.trim()) {
    const mapped = OCCUPATION_TO_SERVICE_SLUG[occupationSlug.trim()];
    if (mapped) return mapped;
  }

  // 3) Fall back to pro's saved category
  const { data: proRow } = await admin
    .from('service_pros')
    .select('category_id, occupation_id, occupations(slug)')
    .eq('user_id', userId)
    .maybeSingle();

  if (proRow) {
    const occSlug = (proRow as { occupations?: { slug?: string } | null })?.occupations?.slug;
    if (occSlug && OCCUPATION_TO_SERVICE_SLUG[occSlug]) {
      return OCCUPATION_TO_SERVICE_SLUG[occSlug];
    }
    const { data: catRow } = await admin
      .from('service_categories')
      .select('slug')
      .eq('id', (proRow as { category_id?: string }).category_id)
      .maybeSingle();
    const slug = (catRow as { slug?: string } | null)?.slug;
    if (slug) return slug;
  }

  return null;
}

/**
 * Create a new add-on (server action).
 * Supports description, occupation slug for category resolution.
 */
export async function createAddonAction(
  serviceCategory: string,
  title: string,
  priceDollars: number,
  accessToken?: string,
  options?: { description?: string; occupationSlug?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const category = await resolveCategorySlug(
      admin,
      userId,
      serviceCategory,
      options?.occupationSlug
    );
    if (!category) {
      return { success: false, error: 'Set your service category or occupation first (My Business), then save.' };
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return { success: false, error: 'Add-on name is required.' };
    const priceCents = dollarsToCents(priceDollars);
    if (priceCents < 0) return { success: false, error: 'Price must be 0 or greater.' };

    const insertData: Record<string, unknown> = {
      pro_id: userId,
      service_category: category,
      title: trimmedTitle,
      price_cents: priceCents,
      is_active: true,
      source: 'manual',
    };
    if (options?.description !== undefined) {
      insertData.description = options.description?.trim() || null;
    }

    const { error } = await admin.from('service_addons').insert(insertData);

    if (error) {
      if (/Maximum 4 active add-ons/i.test(error.message)) {
        return { success: false, error: 'Maximum 4 active add-ons allowed per service category' };
      }
      if (/already have an add-on with this name/i.test(error.message)) {
        return { success: false, error: 'You already have an add-on with this name.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in createAddonAction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

/**
 * Update an add-on (server action).
 */
export async function updateAddonAction(
  addonId: string,
  updates: {
    title?: string;
    priceDollars?: number;
    isActive?: boolean;
    description?: string;
  },
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const updateData: Partial<{ title: string; price_cents: number; is_active: boolean; description: string | null }> = {};
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.priceDollars !== undefined) updateData.price_cents = dollarsToCents(updates.priceDollars);
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;

    const { error } = await admin
      .from('service_addons')
      .update(updateData)
      .eq('id', addonId)
      .eq('pro_id', userId);

    if (error) {
      if (/Maximum 4 active add-ons/i.test(error.message)) {
        return { success: false, error: 'Maximum 4 active add-ons allowed per service category' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateAddonAction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

/**
 * Bulk create add-ons (for onboarding).
 * Uses occupation slug to resolve category; creates only manual addons.
 */
export async function createAddonsBulkAction(
  addons: Array<{ title: string; priceDollars: number; description?: string; isActive?: boolean }>,
  occupationSlug: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const category = await resolveCategorySlug(admin, userId, undefined, occupationSlug);
    if (!category) {
      return { success: false, error: 'Could not resolve service category from occupation.' };
    }

    const toInsert = addons
      .filter((a) => a.title?.trim())
      .slice(0, 4)
      .map((a) => ({
        pro_id: userId,
        service_category: category,
        title: a.title.trim(),
        price_cents: Math.max(0, Math.round((a.priceDollars ?? 0) * 100)),
        description: a.description?.trim() || null,
        is_active: a.isActive !== false,
        source: 'manual',
      }));

    if (toInsert.length === 0) return { success: true };

    const { error } = await admin.from('service_addons').insert(toInsert);
    if (error) {
      if (/already have an add-on with this name/i.test(error.message)) {
        return { success: false, error: 'One or more add-ons have duplicate names.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Error in createAddonsBulkAction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

/**
 * Delete an add-on (server action).
 */
export async function deleteAddonAction(
  addonId: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('service_addons').delete().eq('id', addonId).eq('pro_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Error in deleteAddonAction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}






