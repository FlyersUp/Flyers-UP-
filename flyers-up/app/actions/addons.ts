'use server';

/**
 * Server Actions for Add-Ons
 * 
 * These server actions are used in Server Components and can be called
 * directly from client components via form actions or onClick handlers.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/api';
import { createAddon, updateAddon, deleteAddon, getProAddons } from '@/lib/api';
import { dollarsToCents } from '@/lib/utils/money';

/**
 * Create a new add-on (server action).
 */
export async function createAddonAction(
  serviceCategory: string,
  title: string,
  priceDollars: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'pro') {
      return { success: false, error: 'Unauthorized' };
    }

    const priceCents = dollarsToCents(priceDollars);
    const result = await createAddon(user.id, serviceCategory, title, priceCents);

    if (!result.success) {
      return result;
    }

    return { success: true };
  } catch (err) {
    console.error('Error in createAddonAction:', err);
    return { success: false, error: 'An unexpected error occurred' };
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
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'pro') {
      return { success: false, error: 'Unauthorized' };
    }

    const updateData: { title?: string; priceCents?: number; isActive?: boolean } = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.priceDollars !== undefined) {
      updateData.priceCents = dollarsToCents(updates.priceDollars);
    }
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const result = await updateAddon(addonId, updateData);

    if (!result.success) {
      return result;
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateAddonAction:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an add-on (server action).
 */
export async function deleteAddonAction(addonId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'pro') {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await deleteAddon(addonId);
    return result;
  } catch (err) {
    console.error('Error in deleteAddonAction:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}






