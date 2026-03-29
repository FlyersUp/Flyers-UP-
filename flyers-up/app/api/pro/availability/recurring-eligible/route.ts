/**
 * GET /api/pro/availability/recurring-eligible — pro settings summary for UI (spots left, flags)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProService } from '@/lib/recurring/api-auth';
import { getOrCreateRecurringPreferences, countApprovedRecurringCustomers } from '@/lib/recurring/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const prefs = await getOrCreateRecurringPreferences(admin, pr.userId);
  const count = await countApprovedRecurringCustomers(admin, pr.userId);
  const max = prefs?.max_recurring_customers ?? 5;

  return NextResponse.json({
    ok: true,
    recurring_enabled: prefs?.recurring_enabled !== false,
    max_recurring_customers: max,
    approved_distinct_customers: count,
    spots_left: Math.max(0, max - count),
    only_preferred_clients_can_request: prefs?.only_preferred_clients_can_request === true,
    allow_auto_approval_for_mutual_preference: prefs?.allow_auto_approval_for_mutual_preference === true,
    recurring_only_windows_enabled: prefs?.recurring_only_windows_enabled === true,
  });
}
