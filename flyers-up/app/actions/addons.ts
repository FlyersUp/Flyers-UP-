'use server';

/**
 * Server Actions for Add-Ons
 *
 * IMPORTANT:
 * - Uses the Service Role key server-side to bypass RLS safely.
 * - Still enforces that the caller is an authenticated pro.
 */

import { dollarsToCents } from '@/lib/utils/money';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProUser } from '@/app/actions/_auth';

/**
 * Create a new add-on (server action).
 */
export async function createAddonAction(
  serviceCategory: string,
  title: string,
  priceDollars: number,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    // Prefer the passed category slug, but fall back to the pro's saved category.
    let category = (serviceCategory || '').trim();
    if (!category) {
      const { data: proRow } = await admin
        .from('service_pros')
        .select(
          `
          category_id,
          service_categories ( slug )
        `
        )
        .eq('user_id', userId)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug = (proRow as any)?.service_categories?.slug as string | undefined;
      category = (slug || '').trim();
    }
    if (!category) {
      return { success: false, error: 'Set your service category first (My Business → Service Category), then save.' };
    }

    const priceCents = dollarsToCents(priceDollars);
    const { error } = await admin.from('service_addons').insert({
      pro_id: userId,
      service_category: category,
      title: title.trim(),
      price_cents: priceCents,
      is_active: true,
    });

    if (error) {
      // Mirror the UX-friendly message from the client helper if DB trigger exists.
      if (/Maximum 4 active add-ons/i.test(error.message)) {
        return { success: false, error: 'Maximum 4 active add-ons allowed per service category' };
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
  },
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const updateData: Partial<{ title: string; price_cents: number; is_active: boolean }> = {};
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.priceDollars !== undefined) updateData.price_cents = dollarsToCents(updates.priceDollars);
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

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






