/**
 * GET /api/admin/reconciliation/export
 * CSV of reconciliation snapshots for weekly ops (admin only).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import {
  RECONCILIATION_EXPORT_MAX_BOOKINGS,
  RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS,
  filterSnapshotsForReconciliationExport,
  formatMoneyReconciliationCsv,
  loadMoneyReconciliationWindow,
} from '@/lib/bookings/money-reconciliation-report';
import type { MoneyReconciliationCategory } from '@/lib/bookings/money-reconciliation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES: MoneyReconciliationCategory[] = [
  'healthy',
  'payment_state_mismatch',
  'refund_state_mismatch',
  'payout_state_mismatch',
  'partial_refund_attention',
  'remediation_open',
  'payout_blocked_attention',
  'needs_manual_review',
  'reconciliation_unknown',
];

function parseDays(v: string | null): number {
  const n = Number(v);
  if (Number.isFinite(n) && n >= 1 && n <= 365) return Math.floor(n);
  return 30;
}

function truthy(v: string | null): boolean {
  if (v == null) return false;
  const x = v.toLowerCase();
  return x === '1' || x === 'true' || x === 'yes';
}

function parseMinAgeDays(v: string | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(365, Math.floor(n));
}

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const days = parseDays(url.searchParams.get('days'));
  const fromIso = url.searchParams.get('from')?.trim() || null;
  const toIso = url.searchParams.get('to')?.trim() || null;
  const rawCat = url.searchParams.get('category')?.trim() || '';
  const category = CATEGORIES.includes(rawCat as MoneyReconciliationCategory)
    ? (rawCat as MoneyReconciliationCategory)
    : null;
  const preset = url.searchParams.get('preset')?.trim() ?? '';
  let unresolvedOnly = truthy(url.searchParams.get('unresolved_only'));
  const explicitMinAge = parseMinAgeDays(url.searchParams.get('min_age_days'));
  let minAgeDays: number | undefined = explicitMinAge;
  if (preset === RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS) {
    unresolvedOnly = true;
    if (minAgeDays == null) minAgeDays = 7;
  }

  const admin = createAdminSupabaseClient();
  const { snapshots } = await loadMoneyReconciliationWindow(admin, {
    days,
    fromIso,
    toIso,
    maxBookings: RECONCILIATION_EXPORT_MAX_BOOKINGS,
    unresolvedOnly: false,
  });

  const filtered = filterSnapshotsForReconciliationExport(snapshots, {
    category: category ?? undefined,
    unresolvedOnly,
    minAgeDays,
  });

  const csv = formatMoneyReconciliationCsv(filtered);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename =
    preset === RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS
      ? `money-reconciliation-red-flags-${stamp}.csv`
      : `money-reconciliation-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
