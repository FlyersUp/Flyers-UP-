'use server';

/**
 * Server Actions for Pro profile/business updates.
 *
 * IMPORTANT:
 * - Prefers Service Role on the server to bypass RLS reliably.
 * - Still enforces caller is an authenticated pro.
 * - If the service role key is not configured (common in local dev),
 *   falls back to writing as the authenticated user via RLS.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { UpdateServiceProParams } from '@/lib/api';
import { requireProUser } from '@/app/actions/_auth';
import { createAuthedSupabaseClient } from '@/lib/authedSupabaseServer';

export async function updateMyServiceProAction(
  params: UpdateServiceProParams,
  accessToken?: string
): Promise<{ success: boolean; error?: string; servicePro?: Record<string, unknown> }> {
  try {
    const { userId } = await requireProUser({ accessToken });

    // Build the update payload (DB column names).
    const updateData: Record<string, unknown> = {};
    if (params.display_name !== undefined) updateData.display_name = params.display_name;
    if (params.bio !== undefined) updateData.bio = params.bio;
    if (params.category_id !== undefined) updateData.category_id = params.category_id;
    if (params.starting_price !== undefined) updateData.starting_price = params.starting_price;
    if (params.service_radius !== undefined) updateData.service_radius = params.service_radius;
    if (params.business_hours !== undefined) updateData.business_hours = params.business_hours;
    if (params.available !== undefined) updateData.available = params.available;
    if (params.location !== undefined) updateData.location = params.location;
    if (params.logo_url !== undefined) updateData.logo_url = params.logo_url;
    if (params.years_experience !== undefined) updateData.years_experience = params.years_experience;
    if (params.before_after_photos !== undefined) updateData.before_after_photos = params.before_after_photos;
    if (params.service_descriptions !== undefined) updateData.service_descriptions = params.service_descriptions;
    if (params.service_area_zip !== undefined) updateData.service_area_zip = params.service_area_zip;
    if (params.services_offered !== undefined) updateData.services_offered = params.services_offered;
    if (params.certifications !== undefined) updateData.certifications = params.certifications;
    if (params.service_types !== undefined) updateData.service_types = params.service_types;

    // Prefer admin client (service role). Fall back to authed client (RLS) when missing.
    const writer =
      (() => {
        try {
          return createAdminSupabaseClient();
        } catch {
          if (accessToken) return createAuthedSupabaseClient(accessToken);
          return null;
        }
      })() ?? (await createServerSupabaseClient());

    // Ensure required fields exist for upsert (service_pros has NOT NULL display_name, category_id).
    const { data: existing, error: existErr } = await writer
      .from('service_pros')
      .select('display_name, category_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (existErr) return { success: false, error: existErr.message };

    const displayName =
      (updateData.display_name as string | undefined)?.trim() ||
      (existing?.display_name as string | undefined)?.trim() ||
      '';
    const categoryId =
      (updateData.category_id as string | undefined)?.trim() ||
      (existing?.category_id as string | undefined)?.trim() ||
      '';

    if (!displayName || !categoryId) {
      return {
        success: false,
        error: 'Set your Business Name and Service Category, then save again.',
      };
    }

    const payload: Record<string, unknown> = {
      user_id: userId,
      display_name: displayName,
      category_id: categoryId,
      ...updateData,
    };

    const { data, error } = await writer
      .from('service_pros')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) return { success: false, error: error.message };

    // Read-after-write verification (also powers UI refresh).
    return { success: true, servicePro: (data as unknown as Record<string, unknown>) ?? undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

