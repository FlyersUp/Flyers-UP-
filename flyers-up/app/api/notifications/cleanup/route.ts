/**
 * POST /api/notifications/cleanup
 * Cron-safe: deletes expired notifications. Optionally archives old read notifications.
 * Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ARCHIVE_DAYS = 90;

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  let deletedExpired = 0;
  let archivedOld = 0;

  try {
    const { data: expired, error: delErr } = await admin
      .from('notifications')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (!delErr && Array.isArray(expired)) {
      deletedExpired = expired.length;
    } else if (delErr) {
      console.error('[notifications/cleanup] delete expired failed:', delErr);
    }

    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - ARCHIVE_DAYS);
    const thresholdIso = archiveThreshold.toISOString();

    const { data: toArchive, error: archErr } = await admin
      .from('notifications')
      .delete()
      .lt('created_at', thresholdIso)
      .not('read_at', 'is', null)
      .select('id');

    if (!archErr && Array.isArray(toArchive)) {
      archivedOld = toArchive.length;
    } else if (archErr) {
      console.error('[notifications/cleanup] archive old failed:', archErr);
    }

    return NextResponse.json({
      ok: true,
      deletedExpired,
      archivedOld,
      ranAt: now,
    });
  } catch (err) {
    console.error('[notifications/cleanup] error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
