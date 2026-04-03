/**
 * Server-only profile lifecycle transitions (service role).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEACTIVATION_GRACE_DAYS, isProfileDeactivated, isProfileActiveForOperations } from '@/lib/account/lifecycle';

function deletionDeadlineIso(): string {
  return new Date(Date.now() + DEACTIVATION_GRACE_DAYS * 86400000).toISOString();
}

async function insertLifecycleEvent(
  admin: SupabaseClient,
  userId: string,
  eventType: 'deactivated' | 'reactivated' | 'deletion_scheduled' | 'permanently_deleted',
  metadata?: Record<string, unknown>
) {
  const { error } = await admin.from('account_lifecycle_events').insert({
    user_id: userId,
    event_type: eventType,
    metadata: metadata ?? {},
  });
  if (error) {
    console.warn('[account/lifecycle] account_lifecycle_events insert failed', error.message);
  }
}

export type DeactivateResult =
  | { ok: true; scheduledDeletionAt: string }
  | { ok: false; error: string };

/**
 * Soft-deactivate: hide from marketplace, schedule permanent deletion job.
 */
export async function applyAccountDeactivation(
  admin: SupabaseClient,
  userId: string,
  options?: { deletionReason?: string | null }
): Promise<DeactivateResult> {
  const now = new Date().toISOString();
  const scheduled = deletionDeadlineIso();

  const { data: profile, error: loadErr } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (loadErr || !profile) {
    return { ok: false, error: 'Could not load profile.' };
  }

  if ((profile as { role?: string }).role === 'admin') {
    return { ok: false, error: 'Admin accounts cannot be deactivated through self-serve.' };
  }

  if (!isProfileActiveForOperations((profile as { account_status?: string }).account_status)) {
    return { ok: false, error: 'Account is not active.' };
  }

  const reason =
    options?.deletionReason && options.deletionReason.trim().length > 0
      ? options.deletionReason.trim().slice(0, 2000)
      : null;

  const { data: closureMeta } = await admin
    .from('profiles')
    .select('closure_requested_at')
    .eq('id', userId)
    .maybeSingle();
  const closureRequestedAt =
    (closureMeta as { closure_requested_at?: string | null } | null)?.closure_requested_at?.trim() || now;

  const { error: pErr } = await admin
    .from('profiles')
    .update({
      account_status: 'deactivated',
      deactivated_at: now,
      scheduled_deletion_at: scheduled,
      deletion_reason: reason,
      closure_reason: reason,
      closure_requested_at: closureRequestedAt,
      updated_at: now,
    })
    .eq('id', userId);

  if (pErr) {
    console.error('[account/lifecycle] profiles deactivate failed', pErr);
    return { ok: false, error: 'Could not deactivate account. Try again or contact support.' };
  }

  const { data: sp } = await admin.from('service_pros').select('id, available').eq('user_id', userId).maybeSingle();
  if (sp) {
    const row = sp as { id: string; available?: boolean };
    const { error: spErr } = await admin
      .from('service_pros')
      .update({
        available: false,
        available_before_deactivation: row.available === true,
        closed_at: null,
      })
      .eq('user_id', userId);
    if (spErr) {
      console.error('[account/lifecycle] service_pros deactivate failed', spErr);
      return { ok: false, error: 'Could not update pro profile. Contact support.' };
    }
  }

  await insertLifecycleEvent(admin, userId, 'deactivated', { scheduled_deletion_at: scheduled });
  await insertLifecycleEvent(admin, userId, 'deletion_scheduled', { scheduled_deletion_at: scheduled });

  return { ok: true, scheduledDeletionAt: scheduled };
}

export type ReactivateResult = { ok: true } | { ok: false; error: string };

export async function applyAccountReactivation(admin: SupabaseClient, userId: string): Promise<ReactivateResult> {
  const { data: profile, error: loadErr } = await admin
    .from('profiles')
    .select('account_status, scheduled_deletion_at, role')
    .eq('id', userId)
    .maybeSingle();

  if (loadErr || !profile) {
    return { ok: false, error: 'Could not load profile.' };
  }

  const st = (profile as { account_status?: string }).account_status;
  if (!isProfileDeactivated(st)) {
    return { ok: false, error: 'Account is not deactivated.' };
  }

  const sched = (profile as { scheduled_deletion_at?: string | null }).scheduled_deletion_at;
  if (!sched || new Date(sched).getTime() <= Date.now()) {
    return { ok: false, error: 'The reactivation period has expired. Contact support if you need help.' };
  }

  const now = new Date().toISOString();

  const { error: pErr } = await admin
    .from('profiles')
    .update({
      account_status: 'active',
      deactivated_at: null,
      scheduled_deletion_at: null,
      deletion_reason: null,
      updated_at: now,
    })
    .eq('id', userId);

  if (pErr) {
    console.error('[account/lifecycle] profiles reactivate failed', pErr);
    return { ok: false, error: 'Could not reactivate account.' };
  }

  const { data: sp } = await admin
    .from('service_pros')
    .select('available_before_deactivation')
    .eq('user_id', userId)
    .maybeSingle();

  if (sp) {
    const prev = (sp as { available_before_deactivation?: boolean | null }).available_before_deactivation;
    const restoreAvailable = prev === true;
    const { error: spErr } = await admin
      .from('service_pros')
      .update({
        available: restoreAvailable,
        available_before_deactivation: null,
        closed_at: null,
      })
      .eq('user_id', userId);
    if (spErr) {
      console.error('[account/lifecycle] service_pros reactivate failed', spErr);
      return { ok: false, error: 'Could not restore pro availability.' };
    }
  }

  await insertLifecycleEvent(admin, userId, 'reactivated', {});
  return { ok: true };
}
