/**
 * GET /api/admin/revenue-sim
 * NYC preset GMV / platform revenue scenarios (planning).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import { simulateAllNycScenarios } from '@/lib/analytics/revenue-sim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ scenarios: simulateAllNycScenarios() });
}
