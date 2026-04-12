/**
 * Server-only guardrails before account deactivation (customers + pros).
 * Uses admin Supabase client (service role) for consistent reads under RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PAYOUT_REVIEW_QUEUE_OPEN_STATUSES } from '@/lib/admin/payout-review-queue-status';
import { isBookingStatusTerminalForClosure, type ProClosureBookingRow } from '@/lib/pro/account-closure-service';
import { isProfileActiveForOperations } from '@/lib/account/lifecycle';

export type DeactivationReasonCode =
  | 'ACTIVE_BOOKING'
  | 'IN_PROGRESS_BOOKING'
  | 'PENDING_PAYOUT'
  | 'OPEN_DISPUTE'
  | 'OPEN_STRIPE_DISPUTE'
  | 'OPEN_CLAIM'
  | 'ADMIN_ACCOUNT'
  | 'OTHER';

export type DeactivationCheckResult = {
  allowed: boolean;
  reasons: DeactivationReasonCode[];
  message?: string;
  details?: Record<string, unknown>;
};

const IN_PROGRESS_STATUSES = new Set([
  'in_progress',
  'arrived',
  'on_the_way',
  'pro_en_route',
  'awaiting_pro_arrival',
]);

async function loadBookingRowsForUser(
  admin: SupabaseClient,
  userId: string,
  role: string | null
): Promise<ProClosureBookingRow[]> {
  if (role === 'pro') {
    const { data: sp } = await admin.from('service_pros').select('id').eq('user_id', userId).maybeSingle();
    const proId = (sp as { id?: string } | null)?.id;
    if (!proId) return [];
    const { data } = await admin.from('bookings').select('id, status, suspicious_completion').eq('pro_id', proId);
    return (data ?? []) as ProClosureBookingRow[];
  }
  const { data } = await admin.from('bookings').select('id, status, suspicious_completion').eq('customer_id', userId);
  return (data ?? []) as ProClosureBookingRow[];
}

export async function canDeactivateAccount(
  admin: SupabaseClient,
  userId: string
): Promise<DeactivationCheckResult> {
  const reasons: DeactivationReasonCode[] = [];

  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (pErr || !profile) {
    return {
      allowed: false,
      reasons: ['OTHER'],
      message: 'Could not load your profile.',
      details: { error: pErr?.message },
    };
  }

  const role = profile.role as string | null;
  if (role === 'admin') {
    return {
      allowed: false,
      reasons: ['ADMIN_ACCOUNT'],
      message: 'Admin accounts cannot be deactivated through this flow.',
    };
  }

  if (!isProfileActiveForOperations(profile.account_status as string)) {
    return {
      allowed: false,
      reasons: ['OTHER'],
      message: 'Only active accounts can be deactivated.',
      details: { account_status: profile.account_status },
    };
  }

  const bookings = await loadBookingRowsForUser(admin, userId, role ?? 'customer');
  const bookingIds = bookings.map((b) => b.id).filter(Boolean);

  for (const b of bookings) {
    if (isBookingStatusTerminalForClosure(b.status)) continue;
    reasons.push(IN_PROGRESS_STATUSES.has(b.status) ? 'IN_PROGRESS_BOOKING' : 'ACTIVE_BOOKING');
    break;
  }

  if (bookingIds.length > 0) {
    const { data: prq } = await admin
      .from('payout_review_queue')
      .select('booking_id')
      .in('status', [...PAYOUT_REVIEW_QUEUE_OPEN_STATUSES])
      .in('booking_id', bookingIds);
    if ((prq ?? []).length > 0) reasons.push('PENDING_PAYOUT');
  }

  if (bookingIds.length > 0) {
    const { data: disputes } = await admin
      .from('booking_disputes')
      .select('booking_id')
      .is('resolved_at', null)
      .in('booking_id', bookingIds);
    if ((disputes ?? []).length > 0) reasons.push('OPEN_DISPUTE');
  }

  const { data: stripeDisputes } = await admin
    .from('stripe_disputes')
    .select('id')
    .eq('pro_user_id', userId)
    .eq('status', 'open')
    .limit(1);
  if ((stripeDisputes ?? []).length > 0) {
    reasons.push('OPEN_STRIPE_DISPUTE');
  }

  if (bookingIds.length > 0) {
    const { data: issues } = await admin
      .from('booking_issues')
      .select('id')
      .in('booking_id', bookingIds)
      .neq('status', 'resolved')
      .limit(1);
    if ((issues ?? []).length > 0) {
      reasons.push('OPEN_CLAIM');
    }
  }

  const unique = [...new Set(reasons)];
  if (unique.length === 0) {
    return { allowed: true, reasons: [] };
  }

  const friendly =
    unique.includes('IN_PROGRESS_BOOKING') || unique.includes('ACTIVE_BOOKING')
      ? 'Finish or cancel open jobs before deactivating your account.'
      : unique.includes('PENDING_PAYOUT')
        ? 'A payout on your account needs review before you can deactivate.'
        : unique.includes('OPEN_DISPUTE') || unique.includes('OPEN_CLAIM')
          ? 'Resolve open disputes or claims before deactivating.'
          : unique.includes('OPEN_STRIPE_DISPUTE')
            ? 'You have an open payment dispute (chargeback). Resolve it with support before deactivating.'
            : 'You cannot deactivate your account right now.';

  return {
    allowed: false,
    reasons: unique,
    message: friendly,
    details: { bookingCount: bookings.length },
  };
}
