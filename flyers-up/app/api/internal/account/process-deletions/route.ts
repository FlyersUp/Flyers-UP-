/**
 * POST /api/internal/account/process-deletions
 * Batch permanent anonymization for accounts past scheduled_deletion_at.
 * Protected by CRON_SECRET (header x-cron-secret or ?secret=).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import {
  applyPermanentDeletionAnonymization,
  listProfilesReadyForPermanentDeletion,
} from '@/lib/account/delete-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function runProcessDeletions() {
  const admin = createAdminSupabaseClient();
  const candidates = await listProfilesReadyForPermanentDeletion(admin);

  const results: { userId: string; ok: boolean; error?: string }[] = [];

  for (const row of candidates) {
    const r = await applyPermanentDeletionAnonymization(admin, row.id);
    results.push({
      userId: row.id,
      ok: r.ok,
      error: r.ok ? undefined : r.error,
    });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;
  return runProcessDeletions();
}

/** Some schedulers use GET; same auth as POST. */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;
  return runProcessDeletions();
}
