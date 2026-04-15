/**
 * Admin payout review: bookings flagged for manual review before auto payout release.
 * Source of truth: bookings.requires_admin_review && !payout_released.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveProPayoutTransferCents } from '@/lib/bookings/booking-payout-economics';

export type FlaggedPayoutReviewItem = {
  bookingId: string;
  status: string | null;
  paymentLifecycleStatus: string | null;
  /** Bookings.payout_status — e.g. failed after a transfer attempt */
  payoutStatus?: string | null;
  payoutReleased?: boolean | null;
  payoutTransferId?: string | null;
  stripeTransferId?: string | null;
  payoutHoldReason: string | null;
  completedAt: string | null;
  startedAt: string | null;
  serviceDate: string | null;
  serviceTime: string | null;
  /** Actual job duration in minutes when started + completed present */
  actualDurationMinutes: number | null;
  minimumExpectedDurationMinutes: number | null;
  depositPaid: boolean;
  finalPaid: boolean;
  afterPhotoCount: number;
  disputeOpen: boolean;
  disputeStatus: string | null;
  refundStatus: string | null;
  connectDestinationPresent: boolean;
  stripeChargesEnabled: boolean | null;
  suspiciousCompletion: boolean;
  suspiciousCompletionReason: string | null;
  payoutAmountCents: number | null;
  payoutWarnings: string[];
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  proId: string;
  proName: string | null;
  categoryName: string | null;
  /** Row in payout_review_queue when present */
  queueStatus?: string | null;
  queueHoldReason?: string | null;
  queueInternalNote?: string | null;
  /** From queue.details (e.g. cron after releasePayout failure) */
  queueReleaseError?: string | null;
  queueReleaseNote?: string | null;
  /** booking_payouts.status when joined */
  bookingPayoutRowStatus?: string | null;
  bookingPayoutBlockReason?: string | null;
};

function minutesBetween(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const a = Date.parse(startIso);
  const b = Date.parse(endIso);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

const BOOKING_PAYOUT_REVIEW_SELECT = [
  'id',
  /** `bookings.status` — admin scan context only; queue filters use requires_admin_review + payout_released. */
  'status',
  'payment_lifecycle_status',
  'payout_hold_reason',
  'completed_at',
  'started_at',
  'service_date',
  'service_time',
  'paid_deposit_at',
  'paid_remaining_at',
  'final_payment_status',
  'dispute_open',
  'dispute_status',
  'refund_status',
  'suspicious_completion',
  'suspicious_completion_reason',
  'payout_status',
  'payout_released',
  'payout_transfer_id',
  'stripe_transfer_id',
  'minimum_expected_duration_minutes',
  'stripe_destination_account_id',
  'total_amount_cents',
  'amount_total',
  'amount_subtotal',
  'customer_fees_retained_cents',
  'amount_platform_fee',
  'refunded_total_cents',
  'amount_refunded_cents',
  'customer_id',
  'pro_id',
  'service_pros(display_name, category_id, stripe_account_id, stripe_charges_enabled)',
].join(', ');

async function enrichBookingRowsToItems(
  admin: SupabaseClient,
  list: Record<string, unknown>[]
): Promise<FlaggedPayoutReviewItem[]> {
  if (list.length === 0) return [];

  const bookingIds = list.map((r) => String(r.id));
  const customerIds = [...new Set(list.map((r) => String(r.customer_id)).filter(Boolean))];
  const { data: profiles } = await admin.from('profiles').select('id, full_name, email').in('id', customerIds);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [String((p as { id: string }).id), p as { full_name?: string; email?: string }])
  );

  const proRows = list.map((r) => (r as { service_pros?: { category_id?: string } }).service_pros);
  const categoryIds = [
    ...new Set(
      proRows.map((p) => p?.category_id).filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  const { data: cats } =
    categoryIds.length > 0
      ? await admin.from('service_categories').select('id, name, slug').in('id', categoryIds)
      : { data: [] };
  const catMap = new Map((cats ?? []).map((c) => [String((c as { id: string }).id), c as { name?: string; slug?: string }]));

  const { data: completions } = await admin
    .from('job_completions')
    .select('booking_id, after_photo_urls')
    .in('booking_id', bookingIds);
  const completionMap = new Map(
    (completions ?? []).map((c) => {
      const urls = (c as { after_photo_urls?: string[] }).after_photo_urls ?? [];
      const n = Array.isArray(urls)
        ? urls.filter((u) => typeof u === 'string' && u.trim().length > 5 && !/^(placeholder|n\/a|none)$/i.test(u.trim()))
            .length
        : 0;
      return [String((c as { booking_id: string }).booking_id), n];
    })
  );

  return list.map((raw) => {
    const b = raw as Record<string, unknown>;
    const id = String(b.id);
    const sp = b.service_pros as
      | { display_name?: string; category_id?: string; stripe_account_id?: string; stripe_charges_enabled?: boolean }
      | null;
    const catId = sp?.category_id;
    const cat = catId ? catMap.get(String(catId)) : null;
    const cust = profileMap.get(String(b.customer_id));
    const started = (b.started_at as string) ?? null;
    const completed = (b.completed_at as string) ?? null;
    const payoutRes = resolveProPayoutTransferCents({
      total_amount_cents: b.total_amount_cents as number | null,
      amount_total: b.amount_total as number | null,
      customer_fees_retained_cents: b.customer_fees_retained_cents as number | null,
      amount_platform_fee: b.amount_platform_fee as number | null,
      refunded_total_cents: (b.amount_refunded_cents ?? b.refunded_total_cents) as number | null,
      amount_subtotal: (b.amount_subtotal as number) > 0 ? (b.amount_subtotal as number) : null,
    });
    const dest = String(b.stripe_destination_account_id ?? '').trim();
    const acct = String(sp?.stripe_account_id ?? '').trim();

    return {
      bookingId: id,
      status: (b.status as string) ?? null,
      paymentLifecycleStatus: (b.payment_lifecycle_status as string) ?? null,
      payoutStatus: (b.payout_status as string) ?? null,
      payoutReleased: b.payout_released === true,
      payoutTransferId: (b.payout_transfer_id as string) ?? null,
      stripeTransferId: (b.stripe_transfer_id as string) ?? null,
      payoutHoldReason: (b.payout_hold_reason as string) ?? null,
      completedAt: completed,
      startedAt: started,
      serviceDate: (b.service_date as string) ?? null,
      serviceTime: (b.service_time as string) ?? null,
      actualDurationMinutes: minutesBetween(started, completed),
      minimumExpectedDurationMinutes:
        typeof b.minimum_expected_duration_minutes === 'number' ? b.minimum_expected_duration_minutes : null,
      depositPaid: Boolean(b.paid_deposit_at),
      finalPaid:
        Boolean(b.paid_remaining_at) || String((b.final_payment_status as string) ?? '').toUpperCase() === 'PAID',
      afterPhotoCount: completionMap.get(id) ?? 0,
      disputeOpen: b.dispute_open === true,
      disputeStatus: (b.dispute_status as string) ?? null,
      refundStatus: (b.refund_status as string) ?? null,
      connectDestinationPresent: dest.length > 0 || acct.length > 0,
      stripeChargesEnabled: typeof sp?.stripe_charges_enabled === 'boolean' ? sp.stripe_charges_enabled : null,
      suspiciousCompletion: b.suspicious_completion === true,
      suspiciousCompletionReason: (b.suspicious_completion_reason as string) ?? null,
      payoutAmountCents: payoutRes.payoutCents > 0 ? payoutRes.payoutCents : null,
      payoutWarnings: payoutRes.warnings ?? [],
      customerId: String(b.customer_id),
      customerName: cust?.full_name ?? null,
      customerEmail: cust?.email ?? null,
      proId: String(b.pro_id),
      proName: sp?.display_name ?? null,
      categoryName: cat?.name ?? cat?.slug ?? null,
    };
  });
}

async function attachPayoutReviewQueueMetadata(
  admin: SupabaseClient,
  items: FlaggedPayoutReviewItem[]
): Promise<FlaggedPayoutReviewItem[]> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.bookingId);
  const [{ data: qrows }, { data: bpRows }] = await Promise.all([
    admin.from('payout_review_queue').select('booking_id, status, details').in('booking_id', ids),
    admin.from('booking_payouts').select('booking_id, status, payout_block_reason').in('booking_id', ids),
  ]);

  const bpMap = new Map<string, { status: string; payout_block_reason: string | null }>();
  for (const r of bpRows ?? []) {
    const row = r as { booking_id: string; status: string; payout_block_reason?: string | null };
    bpMap.set(row.booking_id, {
      status: row.status,
      payout_block_reason:
        typeof row.payout_block_reason === 'string' ? row.payout_block_reason : null,
    });
  }

  const qm = new Map<
    string,
    {
      queueStatus: string;
      queueHoldReason: string | null;
      queueInternalNote: string | null;
      queueReleaseError: string | null;
      queueReleaseNote: string | null;
    }
  >();
  for (const r of qrows ?? []) {
    const row = r as { booking_id: string; status: string; details?: Record<string, unknown> | null };
    const d = row.details ?? {};
    const releaseErr = d.release_error;
    const note = d.note;
    qm.set(row.booking_id, {
      queueStatus: row.status,
      queueHoldReason: typeof d.hold_reason === 'string' ? d.hold_reason : null,
      queueInternalNote: typeof d.internal_note === 'string' ? d.internal_note : null,
      queueReleaseError: typeof releaseErr === 'string' ? releaseErr : null,
      queueReleaseNote: typeof note === 'string' ? note : null,
    });
  }
  return items.map((item) => {
    const q = qm.get(item.bookingId);
    const bp = bpMap.get(item.bookingId);
    return {
      ...item,
      queueStatus: q?.queueStatus ?? null,
      queueHoldReason: q?.queueHoldReason ?? null,
      queueInternalNote: q?.queueInternalNote ?? null,
      queueReleaseError: q?.queueReleaseError ?? null,
      queueReleaseNote: q?.queueReleaseNote ?? null,
      bookingPayoutRowStatus: bp?.status ?? null,
      bookingPayoutBlockReason: bp?.payout_block_reason ?? null,
    };
  });
}

export async function loadFlaggedPayoutReviewsForAdmin(
  admin: SupabaseClient
): Promise<{ items: FlaggedPayoutReviewItem[]; count: number }> {
  const { data: rows, error } = await admin
    .from('bookings')
    .select(BOOKING_PAYOUT_REVIEW_SELECT)
    .eq('requires_admin_review', true)
    .eq('payout_released', false)
    .order('completed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[loadFlaggedPayoutReviewsForAdmin]', error);
    return { items: [], count: 0 };
  }

  const list = (rows ?? []) as unknown as Record<string, unknown>[];
  const items = await enrichBookingRowsToItems(admin, list);
  const merged = await attachPayoutReviewQueueMetadata(admin, items);
  return { items: merged, count: merged.length };
}

export async function countFlaggedPayoutReviewsForAdmin(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('requires_admin_review', true)
    .eq('payout_released', false);
  if (error) {
    console.error('[countFlaggedPayoutReviewsForAdmin]', error);
    return 0;
  }
  return count ?? 0;
}

/** Flagged row for one booking, if it is in the review queue. */
export async function loadBookingPayoutReviewSnapshot(
  admin: SupabaseClient,
  bookingId: string
): Promise<FlaggedPayoutReviewItem | null> {
  const { data: raw, error } = await admin
    .from('bookings')
    .select(BOOKING_PAYOUT_REVIEW_SELECT)
    .eq('id', bookingId)
    .eq('requires_admin_review', true)
    .eq('payout_released', false)
    .maybeSingle();

  if (error || !raw) return null;
  const items = await enrichBookingRowsToItems(admin, [raw as unknown as Record<string, unknown>]);
  const base = items[0];
  if (!base) return null;
  const merged = await attachPayoutReviewQueueMetadata(admin, [base]);
  return merged[0] ?? null;
}

/**
 * Snapshot for admin booking payout card (any booking — caller checks requires_admin_review + payout_released).
 */
export async function loadAdminBookingPayoutCardData(
  admin: SupabaseClient,
  bookingId: string
): Promise<FlaggedPayoutReviewItem | null> {
  const { data: raw, error } = await admin
    .from('bookings')
    .select(BOOKING_PAYOUT_REVIEW_SELECT)
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !raw) return null;
  const items = await enrichBookingRowsToItems(admin, [raw as unknown as Record<string, unknown>]);
  const base = items[0];
  if (!base) return null;
  const merged = await attachPayoutReviewQueueMetadata(admin, [base]);
  return merged[0] ?? null;
}
