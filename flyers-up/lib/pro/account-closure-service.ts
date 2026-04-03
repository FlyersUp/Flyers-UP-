/**
 * Service Pro self-serve account closure — blocking checks and DB updates.
 * Use with service-role Supabase client from API routes / server actions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { applyAccountDeactivation } from '@/lib/account/apply-lifecycle';
import { canDeactivateAccount } from '@/lib/account/can-deactivate-account';
import type { ProfileAccountStatus } from '@/lib/pro/account-status';

/** Machine-readable blocker codes for API clients */
export type ProClosureBlockCode = 'active_booking' | 'payout_review_pending' | 'open_dispute';

export type ProClosureBlockItem = {
  code: ProClosureBlockCode;
  message: string;
};

export type ProClosureEvaluation = {
  blocked: boolean;
  blocked_by: ProClosureBlockItem[];
};

export type ProClosureApplyResult =
  | { ok: true; status: 'deactivated' | 'already_deactivated' | 'already_deleted' }
  | { ok: false; error: string; evaluation?: ProClosureEvaluation };

/**
 * Booking statuses that do not block closure — must stay aligned with
 * `bookings_status_check` (see supabase migrations). Anything omitted here is
 * treated as an active job and blocks self-serve closure.
 */
export const CLOSURE_TERMINAL_BOOKING_STATUSES = new Set<string>([
  // Completed / paid-out pipeline
  'completed',
  'review_pending',
  'customer_confirmed',
  'auto_confirmed',
  'paid',
  'payout_eligible',
  'payout_released',
  // Never paid / declined / expired
  'expired_unpaid',
  'declined',
  // Cancellations (all spellings / variants)
  'cancelled',
  'cancelled_expired',
  'cancelled_by_customer',
  'cancelled_by_pro',
  'cancelled_admin',
  'canceled_no_show_pro',
  'canceled_no_show_customer',
  // Refunds / disputes at booking row (open disputes also gated via booking_disputes)
  'refund_pending',
  'refunded',
  'disputed',
]);

export function isBookingStatusTerminalForClosure(status: string): boolean {
  return CLOSURE_TERMINAL_BOOKING_STATUSES.has(status);
}

export type ProClosureBookingRow = {
  id: string;
  status: string;
  suspicious_completion?: boolean | null;
};

/**
 * Pure evaluation for tests — no I/O.
 */
export function evaluateProClosureFromBookingsAndReviews(
  bookings: ProClosureBookingRow[],
  pendingPayoutReviewBookingIds: Set<string>,
  openDisputeBookingIds: Set<string>
): ProClosureEvaluation {
  const blocked_by: ProClosureBlockItem[] = [];

  for (const b of bookings) {
    if (!isBookingStatusTerminalForClosure(b.status)) {
      blocked_by.push({
        code: 'active_booking',
        message: 'You have at least one job that is still open or in progress. Finish or cancel it before closing your account.',
      });
      break;
    }
  }

  if (pendingPayoutReviewBookingIds.size > 0) {
    blocked_by.push({
      code: 'payout_review_pending',
      message: 'A payout on your account needs review. Please wait for Flyers Up to finish the review, or contact support.',
    });
  }

  if (openDisputeBookingIds.size > 0) {
    blocked_by.push({
      code: 'open_dispute',
      message: 'You have an open dispute. Resolve it with support before closing your account.',
    });
  }

  return { blocked: blocked_by.length > 0, blocked_by };
}

export async function loadProClosureContext(
  admin: SupabaseClient,
  userId: string
): Promise<{
  profile: { account_status: ProfileAccountStatus | string } | null;
  proId: string | null;
  bookings: ProClosureBookingRow[];
  pendingPayoutReviewBookingIds: Set<string>;
  openDisputeBookingIds: Set<string>;
}> {
  const { data: profile } = await admin.from('profiles').select('account_status').eq('id', userId).maybeSingle();

  const { data: proRow } = await admin.from('service_pros').select('id').eq('user_id', userId).maybeSingle();
  const proId = proRow?.id ? String(proRow.id) : null;

  if (!proId) {
    return {
      profile,
      proId: null,
      bookings: [],
      pendingPayoutReviewBookingIds: new Set(),
      openDisputeBookingIds: new Set(),
    };
  }

  const { data: bookingRows } = await admin
    .from('bookings')
    .select('id, status, suspicious_completion')
    .eq('pro_id', proId);

  const bookings = (bookingRows ?? []) as ProClosureBookingRow[];
  const bookingIds = bookings.map((b) => b.id);

  let pendingPayoutReviewBookingIds = new Set<string>();
  if (bookingIds.length > 0) {
    const { data: prq } = await admin
      .from('payout_review_queue')
      .select('booking_id')
      .eq('status', 'pending')
      .in('booking_id', bookingIds);
    pendingPayoutReviewBookingIds = new Set(
      (prq ?? []).map((r: { booking_id: string }) => r.booking_id).filter(Boolean)
    );
  }

  let openDisputeBookingIds = new Set<string>();
  if (bookingIds.length > 0) {
    const { data: disputes } = await admin
      .from('booking_disputes')
      .select('booking_id')
      .is('resolved_at', null)
      .in('booking_id', bookingIds);
    openDisputeBookingIds = new Set(
      (disputes ?? []).map((r: { booking_id: string }) => r.booking_id).filter(Boolean)
    );
  }

  return {
    profile,
    proId,
    bookings,
    pendingPayoutReviewBookingIds,
    openDisputeBookingIds,
  };
}

export async function evaluateProAccountClosure(
  admin: SupabaseClient,
  userId: string
): Promise<ProClosureEvaluation> {
  const ctx = await loadProClosureContext(admin, userId);
  return evaluateProClosureFromBookingsAndReviews(
    ctx.bookings,
    ctx.pendingPayoutReviewBookingIds,
    ctx.openDisputeBookingIds
  );
}

const USER_FRIENDLY_BLOCKED =
  "You can't close your account yet because you still have active jobs or payout issues to resolve.";

/**
 * Apply closure updates. Caller must verify evaluation first (or rely on this to re-check).
 */
function deactivationCheckToEvaluation(check: Awaited<ReturnType<typeof canDeactivateAccount>>): ProClosureEvaluation {
  const blocked_by: ProClosureBlockItem[] = [];
  for (const code of check.reasons) {
    if (code === 'ACTIVE_BOOKING' || code === 'IN_PROGRESS_BOOKING') {
      blocked_by.push({
        code: 'active_booking',
        message: check.message ?? USER_FRIENDLY_BLOCKED,
      });
      break;
    }
    if (code === 'PENDING_PAYOUT') {
      blocked_by.push({
        code: 'payout_review_pending',
        message: check.message ?? USER_FRIENDLY_BLOCKED,
      });
    }
    if (code === 'OPEN_DISPUTE' || code === 'OPEN_CLAIM' || code === 'OPEN_STRIPE_DISPUTE') {
      blocked_by.push({
        code: 'open_dispute',
        message: check.message ?? USER_FRIENDLY_BLOCKED,
      });
    }
  }
  if (blocked_by.length === 0 && !check.allowed) {
    blocked_by.push({ code: 'active_booking', message: check.message ?? USER_FRIENDLY_BLOCKED });
  }
  return { blocked: true, blocked_by };
}

export async function applyProAccountClosure(
  admin: SupabaseClient,
  userId: string,
  options?: { closureReason?: string | null; skipBlockerCheck?: boolean }
): Promise<ProClosureApplyResult> {
  const ctx = await loadProClosureContext(admin, userId);
  if (!ctx.proId) {
    return { ok: false, error: 'No service pro profile found for this account.' };
  }

  const status = (ctx.profile as { account_status?: string } | null)?.account_status;
  if (status === 'deleted') {
    return { ok: true, status: 'already_deleted' };
  }
  if (status === 'deactivated') {
    return { ok: true, status: 'already_deactivated' };
  }

  if (!options?.skipBlockerCheck) {
    const check = await canDeactivateAccount(admin, userId);
    if (!check.allowed) {
      return {
        ok: false,
        error: check.message ?? USER_FRIENDLY_BLOCKED,
        evaluation: deactivationCheckToEvaluation(check),
      };
    }
  }

  const reason =
    options?.closureReason && options.closureReason.trim().length > 0 ? options.closureReason.trim() : null;

  const deactivated = await applyAccountDeactivation(admin, userId, { deletionReason: reason });
  if (!deactivated.ok) {
    return { ok: false, error: deactivated.error };
  }

  return { ok: true, status: 'deactivated' };
}

export { USER_FRIENDLY_BLOCKED };
