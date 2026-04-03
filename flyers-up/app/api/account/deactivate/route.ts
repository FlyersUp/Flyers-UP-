/**
 * POST /api/account/deactivate
 * Soft-deactivate (30-day grace before permanent anonymization job).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { canDeactivateAccount } from '@/lib/account/can-deactivate-account';
import { applyAccountDeactivation } from '@/lib/account/apply-lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, reasons: [], message: 'Sign in required.' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      confirmPhrase?: string;
      reason?: string;
    };

    const CONFIRM = 'DEACTIVATE MY ACCOUNT';
    if (typeof body.confirmPhrase !== 'string' || body.confirmPhrase.trim() !== CONFIRM) {
      return NextResponse.json(
        {
          success: false,
          reasons: ['OTHER'],
          message: `Type "${CONFIRM}" exactly to confirm.`,
        },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const check = await canDeactivateAccount(admin, user.id);
    if (!check.allowed) {
      return NextResponse.json(
        {
          success: false,
          reasons: check.reasons,
          message: check.message ?? 'Cannot deactivate right now.',
          details: check.details,
        },
        { status: 409 }
      );
    }

    const applied = await applyAccountDeactivation(admin, user.id, {
      deletionReason: typeof body.reason === 'string' ? body.reason : null,
    });

    if (!applied.ok) {
      return NextResponse.json(
        { success: false, reasons: ['OTHER'], message: applied.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scheduledDeletionAt: applied.scheduledDeletionAt,
      message: `Account deactivated. Permanent deletion is scheduled for ${applied.scheduledDeletionAt}. You can reactivate any time before then.`,
    });
  } catch (e) {
    console.error('[api/account/deactivate]', e);
    return NextResponse.json(
      { success: false, reasons: ['OTHER'], message: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
