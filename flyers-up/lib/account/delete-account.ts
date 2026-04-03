/**
 * Permanent account anonymization after deactivation grace period (server-only, service role).
 *
 * RETAINED (legal / financial / integrity):
 * - profiles.id (FK anchor for bookings, Stripe metadata, etc.)
 * - bookings rows and money columns
 * - payout_review_queue, booking_disputes, stripe_disputes, payment-related tables
 * - service_pros.id row when pro (FK on bookings.pro_id) — scrub public-facing fields only
 *
 * SCRUBBED:
 * - profiles: email, names, phone, zip, avatar, preferences that are PII
 * - service_pros: display_name placeholder, bio, location, logo, rich media JSON cleared
 *
 * AUTH USERS:
 * - We do not delete auth.users here when bookings still reference profile id;
 *   email is scrubbed on profile; sign-in may fail if auth email unchanged — see applyPermanentDeletionAnonymization
 *   which updates profiles.email; Supabase Auth email update may require Admin API — optional follow-up.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_EMAIL = (userId: string) => `deleted+${userId.replace(/-/g, '')}@invalid.flyersup.local`;
const PLACEHOLDER_PRO_NAME = 'Former pro';

export type PermanentDeletionResult =
  | { ok: true; userId: string }
  | { ok: false; userId: string; error: string };

export async function applyPermanentDeletionAnonymization(
  admin: SupabaseClient,
  userId: string
): Promise<PermanentDeletionResult> {
  const now = new Date().toISOString();

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('account_status, scheduled_deletion_at')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) {
      return { ok: false, userId, error: 'Profile not found' };
    }

    if ((profile as { account_status?: string }).account_status === 'deleted') {
      return { ok: true, userId };
    }

    if ((profile as { account_status?: string }).account_status !== 'deactivated') {
      return { ok: false, userId, error: 'Account is not scheduled for deletion' };
    }

    const sched = (profile as { scheduled_deletion_at?: string | null }).scheduled_deletion_at;
    if (sched && new Date(sched).getTime() > Date.now()) {
      return { ok: false, userId, error: 'Deletion grace period not expired' };
    }

    const scrubEmail = PLACEHOLDER_EMAIL(userId);

    const { error: pErr } = await admin
      .from('profiles')
      .update({
        account_status: 'deleted',
        deleted_at: now,
        scheduled_deletion_at: null,
        deactivated_at: null,
        email: scrubEmail,
        first_name: null,
        last_name: null,
        full_name: null,
        phone: null,
        zip_code: null,
        avatar_url: null,
        language_preference: null,
        onboarding_step: null,
        updated_at: now,
      })
      .eq('id', userId);

    if (pErr) {
      console.error('[account/delete] profiles scrub failed', userId, pErr);
      return { ok: false, userId, error: pErr.message };
    }

    const { data: sp } = await admin.from('service_pros').select('id').eq('user_id', userId).maybeSingle();
    if (sp) {
      const { error: spErr } = await admin
        .from('service_pros')
        .update({
          display_name: PLACEHOLDER_PRO_NAME,
          bio: null,
          location: null,
          logo_url: null,
          service_descriptions: null,
          before_after_photos: null,
          certifications: null,
          service_types: null,
          services_offered: null,
          business_hours: null,
          available: false,
          available_before_deactivation: null,
          closed_at: now,
        })
        .eq('user_id', userId);

      if (spErr) {
        console.error('[account/delete] service_pros scrub failed', userId, spErr);
        return { ok: false, userId, error: spErr.message };
      }
    }

    const { error: evErr } = await admin.from('account_lifecycle_events').insert({
      user_id: userId,
      event_type: 'permanently_deleted',
      metadata: { deleted_at: now },
    });
    if (evErr) {
      console.warn('[account/delete] lifecycle event failed', evErr.message);
    }

    return { ok: true, userId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[account/delete] unexpected', userId, e);
    return { ok: false, userId, error: msg };
  }
}

export async function listProfilesReadyForPermanentDeletion(
  admin: SupabaseClient
): Promise<{ id: string }[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('account_status', 'deactivated')
    .lte('scheduled_deletion_at', new Date().toISOString());

  if (error) {
    console.error('[account/delete] list failed', error);
    return [];
  }
  return (data ?? []) as { id: string }[];
}
