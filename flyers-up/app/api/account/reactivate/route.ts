/**
 * POST /api/account/reactivate
 * Restore active status during grace period (explicit user action).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { applyAccountReactivation } from '@/lib/account/apply-lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Sign in required.' }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const result = await applyAccountReactivation(admin, user.id);

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your account has been reactivated.',
    });
  } catch (e) {
    console.error('[api/account/reactivate]', e);
    return NextResponse.json({ success: false, message: 'Something went wrong.' }, { status: 500 });
  }
}
