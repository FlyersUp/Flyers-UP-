'use server';

/**
 * Server Actions for Profiles (customers + pros).
 *
 * We prefer the Service Role key for the write so we never lose data to RLS/cookie issues,
 * but we still authenticate the caller via access token (preferred) or cookies.
 *
 * IMPORTANT: If the service role key is not configured (common in local dev),
 * we gracefully fall back to writing as the authenticated user via RLS.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireUser } from '@/app/actions/_auth';
import { createAuthedSupabaseClient } from '@/lib/authedSupabaseServer';

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

    const updateData: Record<string, unknown> = { id: userId };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) updateData[k] = v;
    }

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

    const { data, error } = await writer
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

