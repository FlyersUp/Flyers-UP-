'use server';

/**
 * Server Actions for Profiles (customers + pros).
 *
 * We use the Service Role key for the write so we never lose data to RLS/cookie issues,
 * but we still authenticate the caller via access token (preferred) or cookies.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireUser } from '@/app/actions/_auth';

export type UpdateMyProfileParams = {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  zip_code?: string | null;
  email?: string | null;
  onboarding_step?: string | null;
};

export async function updateMyProfileAction(
  params: UpdateMyProfileParams,
  accessToken?: string
): Promise<{ success: boolean; error?: string; profile?: Record<string, unknown> }> {
  try {
    const { userId } = await requireUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const updateData: Record<string, unknown> = { id: userId };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) updateData[k] = v;
    }

    const { data, error } = await admin
      .from('profiles')
      .upsert(updateData, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profile: (data as unknown as Record<string, unknown>) ?? undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

