/**
 * DB-backed queue metadata for admin money reconciliation (assignee, review, note).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyReconciliationSnapshot } from '@/lib/bookings/money-reconciliation';

export type AssignableReconciliationAdmin = { id: string; label: string };

export async function listAssignableReconciliationAdmins(
  admin: SupabaseClient
): Promise<AssignableReconciliationAdmin[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin')
    .order('email', { ascending: true })
    .limit(100);
  if (error) {
    console.warn('[money-reconciliation-queue] list admins failed', error);
    return [];
  }
  return (data ?? []).map((p) => {
    const id = String((p as { id: string }).id);
    const fn = (p as { full_name: string | null }).full_name?.trim();
    const em = (p as { email: string | null }).email;
    const label = [fn, em].filter(Boolean).join(' · ') || id.slice(0, 8);
    return { id, label };
  });
}

/**
 * Join `booking_money_reconciliation_ops` (+ profile labels) onto snapshots.
 */
export async function mergeQueueIntoSnapshots(
  admin: SupabaseClient,
  snapshots: MoneyReconciliationSnapshot[]
): Promise<MoneyReconciliationSnapshot[]> {
  const ids = [...new Set(snapshots.map((s) => s.bookingId).filter(Boolean))];
  if (ids.length === 0) return snapshots;

  const { data: rows, error } = await admin
    .from('booking_money_reconciliation_ops')
    .select('booking_id, assigned_to, last_reviewed_at, ops_note')
    .in('booking_id', ids);

  if (error) {
    console.warn('[money-reconciliation-queue] ops fetch failed', error);
    return snapshots;
  }

  const assigneeIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => (r as { assigned_to: string | null }).assigned_to)
        .filter((x): x is string => Boolean(x))
    ),
  ];
  const labelByUser = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profs } = await admin.from('profiles').select('id, email, full_name').in('id', assigneeIds);
    for (const p of profs ?? []) {
      const id = String((p as { id: string }).id);
      const fn = (p as { full_name: string | null }).full_name?.trim();
      const em = (p as { email: string | null }).email;
      labelByUser.set(id, [fn, em].filter(Boolean).join(' · ') || id.slice(0, 8));
    }
  }

  const byBooking = new Map<
    string,
    { assigned_to: string | null; last_reviewed_at: string | null; ops_note: string | null }
  >();
  for (const r of rows ?? []) {
    const bid = String((r as { booking_id: string }).booking_id);
    byBooking.set(bid, {
      assigned_to: (r as { assigned_to: string | null }).assigned_to ?? null,
      last_reviewed_at: (r as { last_reviewed_at: string | null }).last_reviewed_at ?? null,
      ops_note: (r as { ops_note: string | null }).ops_note ?? null,
    });
  }

  return snapshots.map((s) => {
    const o = byBooking.get(s.bookingId);
    if (!o) return s;
    const uid = o.assigned_to;
    return {
      ...s,
      assignedToUserId: uid,
      assignedToLabel: uid ? labelByUser.get(uid) ?? uid.slice(0, 8) : null,
      lastReviewedAt: o.last_reviewed_at,
      opsNote: o.ops_note,
    };
  });
}
