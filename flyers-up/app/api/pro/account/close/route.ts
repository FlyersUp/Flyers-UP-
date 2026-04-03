/**
 * POST /api/pro/account/close
 * Self-serve soft-close for service pros (retains financial records).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { applyProAccountClosure, USER_FRIENDLY_BLOCKED } from '@/lib/pro/account-closure-service';

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
        { success: false, status: 'unauthorized', blocked_by: [], message: 'Sign in required.' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    const admin = createAdminSupabaseClient();

    // Match Privacy & Security UI: pro closure is for users with a service_pros row,
    // not only profiles.role === 'pro' (role can lag or mismatch for some accounts).
    const { data: proRow } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
    if (!proRow) {
      return NextResponse.json(
        {
          success: false,
          status: 'forbidden',
          blocked_by: [],
          message: 'Only service pro accounts can use this action.',
        },
        { status: 403 }
      );
    }

    const result = await applyProAccountClosure(admin, user.id, {
      closureReason: typeof body.reason === 'string' ? body.reason : null,
    });

    if (!result.ok) {
      if (result.evaluation?.blocked) {
        return NextResponse.json(
          {
            success: false,
            status: 'blocked',
            blocked_by: result.evaluation.blocked_by,
            message: result.error || USER_FRIENDLY_BLOCKED,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, status: 'error', blocked_by: [], message: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      blocked_by: [],
      message:
        result.status === 'already_deactivated' || result.status === 'already_deleted'
          ? 'Your account was already deactivated.'
          : 'Your account has been deactivated. You can reactivate within 30 days before permanent deletion.',
    });
  } catch (e) {
    console.error('[api/pro/account/close]', e);
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        blocked_by: [],
        message: 'Something went wrong. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}
