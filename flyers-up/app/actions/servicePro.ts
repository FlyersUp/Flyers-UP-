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
import { getSupportInboxEmail } from '@/lib/support/official-contact';

export async function updateMyServiceProAction(
  params: UpdateServiceProParams,
  accessToken?: string
): Promise<{ success: boolean; error?: string; servicePro?: Record<string, unknown> }> {
  try {
    const { userId } = await requireProUser({ accessToken });

    const gateWriter =
      (() => {
        try {
          return createAdminSupabaseClient();
        } catch {
          return null;
        }
      })() ?? (await createServerSupabaseClient());
    const { data: acct } = await gateWriter.from('profiles').select('account_status').eq('id', userId).maybeSingle();
    if ((acct as { account_status?: string | null } | null)?.account_status !== 'active') {
      return {
        success: false,
        error: `Your pro account is closed. Contact ${getSupportInboxEmail()} if you need help.`,
      };
    }

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
    if (params.same_day_available !== undefined) {
      updateData.same_day_available = params.same_day_available;
      // Keep in sync with operations/deposit validation (availabilityValidation)
      updateData.same_day_enabled = params.same_day_available;
    }
    if (params.lead_time_minutes !== undefined) {
      const n = Math.round(Number(params.lead_time_minutes));
      if (Number.isFinite(n) && n >= 0 && n <= 60 * 24 * 14) {
        updateData.lead_time_minutes = n;
      }
    }

    const minJobPrice = params.min_job_price;

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

    // Enforce: primary occupation cannot be changed after signup (only exception: first-time set or admin)
    const existingCategoryId = (existing?.category_id as string | undefined)?.trim() || '';
    const requestedCategoryId = (params.category_id as string | undefined)?.trim() || '';
    if (existingCategoryId && requestedCategoryId && requestedCategoryId !== existingCategoryId) {
      return {
        success: false,
        error: 'Primary occupation cannot be changed after signup. Your occupation is locked.',
      };
    }

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

    // Sync min_job_price to pro_profiles when provided
    if (minJobPrice !== undefined) {
      const { error: ppErr } = await writer
        .from('pro_profiles')
        .upsert({ user_id: userId, min_job_price: minJobPrice }, { onConflict: 'user_id' });
      if (ppErr) console.warn('[pro_profiles] min_job_price sync:', ppErr.message);
    }

    if (params.same_day_available !== undefined) {
      const { error: ppSdErr } = await writer
        .from('pro_profiles')
        .upsert(
          { user_id: userId, same_day_bookings: params.same_day_available },
          { onConflict: 'user_id' }
        );
      if (ppSdErr) console.warn('[pro_profiles] same_day_bookings sync:', ppSdErr.message);
    }

    // Sync service_types to service_addons so customers see them at checkout (migration 063)
    if (params.service_types !== undefined) {
      try {
        const { data: cat } = await writer
          .from('service_categories')
          .select('slug')
          .eq('id', categoryId)
          .maybeSingle();
        const categorySlug = (cat as { slug?: string } | null)?.slug;
        if (categorySlug) {
          const types = Array.isArray(params.service_types)
            ? (params.service_types as Array<{ name?: string; price?: string | number }>)
            : [];
          const validTypes = types.filter(
            (t) => t && typeof t.name === 'string' && t.name.trim() && (t.price === 0 || (t.price != null && !Number.isNaN(Number(t.price))))
          );
          // Delete existing service_types-synced addons (requires source column from migration 063)
          await writer
            .from('service_addons')
            .delete()
            .eq('pro_id', userId)
            .eq('service_category', categorySlug)
            .eq('source', 'service_types');
          // Insert new addons from service_types
          for (const t of validTypes) {
            const priceCents = Math.round(Number(t.price) * 100);
            if (priceCents < 0) continue;
            await writer.from('service_addons').insert({
              pro_id: userId,
              service_category: categorySlug,
              title: String(t.name).trim(),
              price_cents: priceCents,
              is_active: true,
              source: 'service_types',
            });
          }
        }
      } catch (syncErr) {
        // source column may not exist before migration 063; log and continue
        console.warn('[servicePro] service_types sync to addons:', syncErr);
      }
    }

    // Read-after-write verification (also powers UI refresh).
    return { success: true, servicePro: (data as unknown as Record<string, unknown>) ?? undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

