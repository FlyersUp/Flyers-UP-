/**
 * GET /api/admin/scope-lock-analytics
 * Admin analytics for Scope Lock: mismatch rate, price adjustments, etc.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  try {
    const { data: analytics, error } = await admin
      .from('admin_scope_lock_analytics')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Scope lock analytics error', error);
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    const { data: frequentUsers } = await admin
      .from('customer_misrepresentation_scores')
      .select('customer_id, mismatch_count, last_mismatch_at')
      .gte('mismatch_count', 3)
      .order('mismatch_count', { ascending: false })
      .limit(10);

    return NextResponse.json({
      analytics: analytics ?? {},
      frequentMisrepresentationUsers: frequentUsers ?? [],
    });
  } catch (err) {
    console.error('Scope lock analytics error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
