'use server';

/**
 * Server Actions for Pro profile/business updates.
 *
 * IMPORTANT:
 * - Uses Service Role on the server to bypass RLS reliably.
 * - Still enforces caller is an authenticated pro.
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import type { UpdateServiceProParams } from '@/lib/api';

async function requireProUser(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') throw new Error('Unauthorized');

  return { userId: user.id };
}

export async function updateMyServiceProAction(
  params: UpdateServiceProParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser();
    const admin = createAdminSupabaseClient();

    // Build the update payload (DB column names).
    const updateData: Record<string, unknown> = {};
    if (params.display_name !== undefined) updateData.display_name = params.display_name;
    if (params.bio !== undefined) updateData.bio = params.bio;
    if (params.category_id !== undefined) updateData.category_id = params.category_id;
    if (params.starting_price !== undefined) updateData.starting_price = params.starting_price;
    if (params.service_radius !== undefined) updateData.service_radius = params.service_radius;
    if (params.business_hours !== undefined) updateData.business_hours = params.business_hours;
    if (params.location !== undefined) updateData.location = params.location;
    if (params.logo_url !== undefined) updateData.logo_url = params.logo_url;
    if (params.years_experience !== undefined) updateData.years_experience = params.years_experience;
    if (params.before_after_photos !== undefined) updateData.before_after_photos = params.before_after_photos;
    if (params.service_descriptions !== undefined) updateData.service_descriptions = params.service_descriptions;
    if (params.service_area_zip !== undefined) updateData.service_area_zip = params.service_area_zip;
    if (params.services_offered !== undefined) updateData.services_offered = params.services_offered;
    if (params.certifications !== undefined) updateData.certifications = params.certifications;
    if (params.service_types !== undefined) updateData.service_types = params.service_types;

    const { error } = await admin.from('service_pros').update(updateData).eq('user_id', userId);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

