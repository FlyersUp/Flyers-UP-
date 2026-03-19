'use server';

/**
 * Server action: submit a bug report.
 * Validates payload, never trusts client-only fields blindly.
 * Uses admin Supabase client to bypass RLS.
 * Graceful fallback if logging fails - we still return success to avoid user frustration.
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

const MAX_USER_NOTE = 2000;
const MAX_STRING = 2000;
const MAX_STACK = 8000;

function safeString(v: unknown, max = MAX_STRING): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export type SubmitBugReportResult =
  | { ok: true; referenceId: string }
  | { ok: false; error: string };

export async function submitBugReport(payload: {
  userNote?: string | null;
  pathname?: string | null;
  fullUrl?: string | null;
  errorType?: string | null;
  errorMessage?: string | null;
  errorDigest?: string | null;
  stack?: string | null;
  userAgent?: string | null;
  viewport?: string | null;
  referrer?: string | null;
  appVersion?: string | null;
}): Promise<SubmitBugReportResult> {
  const userNote = safeString(payload.userNote, MAX_USER_NOTE);
  const pathname = safeString(payload.pathname, 500);
  const fullUrl = safeString(payload.fullUrl, MAX_STRING);
  const errorType = safeString(payload.errorType, 100);
  const errorMessage = safeString(payload.errorMessage, MAX_STRING);
  const errorDigest = safeString(payload.errorDigest, 100);
  const stack = safeString(payload.stack, MAX_STACK);
  const userAgent = safeString(payload.userAgent, 500);
  const viewport = safeString(payload.viewport, 100);
  const referrer = safeString(payload.referrer, MAX_STRING);
  const appVersion = safeString(payload.appVersion, 50);

  let userId: string | null = null;
  let role: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const r = profile?.role;
      if (r === 'customer' || r === 'pro' || r === 'admin') {
        role = r;
      }
    }
  } catch {
    userId = null;
    role = null;
  }

  try {
    let admin;
    try {
      admin = createAdminSupabaseClient();
    } catch (envErr) {
      console.warn('Bug report: admin client not available', envErr);
      return { ok: false, error: 'Reporting is temporarily unavailable.' };
    }
    const { data: inserted, error } = await admin
      .from('bug_reports')
      .insert({
        user_id: userId,
        role,
        pathname: pathname ?? null,
        full_url: fullUrl ?? null,
        error_type: errorType ?? null,
        error_message: errorMessage ?? null,
        error_digest: errorDigest ?? null,
        stack: stack ?? null,
        user_note: userNote ?? null,
        screenshot_url: null,
        user_agent: userAgent ?? null,
        viewport: viewport ?? null,
        referrer: referrer ?? null,
        app_version: appVersion ?? null,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('bug_reports insert failed:', error.message);
      return { ok: false, error: 'Failed to save report. Please try again.' };
    }

    const referenceId = inserted?.id ?? 'unknown';
    return { ok: true, referenceId };
  } catch (err) {
    console.warn('submitBugReport error:', err);
    return { ok: false, error: 'Something went wrong. Please try again later.' };
  }
}
