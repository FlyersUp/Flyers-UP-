import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { attemptFinalCharge } from '@/lib/bookings/payment-lifecycle-service';
import {
  fetchLegacyFinalChargeCandidateIds,
  fetchPrimaryFinalChargeCandidateIds,
  reconcileBookingForFinalAutoCharge,
  resetStaleFinalProcessingBookings,
} from '@/lib/bookings/final-charge-candidates';
import { runStaleFinalPaymentCustomerReminders } from '@/lib/bookings/stale-final-payment-reminder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG = '[cron/bookings/final-charge-scheduler]';

/**
 * This route only **retries** final charges and **nudges** customers on stale unpaid balances.
 * It does **not** decide when a payout should start; payout timing stays in lifecycle + release APIs.
 */

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) {
    console.warn(`${LOG} auth failed or cron misconfigured`);
    return authErr;
  }

  const admin = createSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const resetCount = await resetStaleFinalProcessingBookings(admin, staleBefore);
  if (resetCount > 0) {
    console.info(`${LOG} reset stale final_processing`, { count: resetCount, staleBefore });
  }

  const primary = await fetchPrimaryFinalChargeCandidateIds(admin, nowIso);
  const legacy = await fetchLegacyFinalChargeCandidateIds(admin, nowIso);
  const idSet = new Set<string>([...primary, ...legacy]);
  const allIds = [...idSet];

  console.info(`${LOG} run`, {
    nowIso,
    primaryCount: primary.length,
    legacyCount: legacy.length,
    uniqueCandidates: allIds.length,
    resetStaleFinalProcessing: resetCount,
  });

  let attempted = 0;
  const results: { id: string; ok: boolean; code?: string }[] = [];

  let staleFinalReminders = { notified: 0, scanned: 0 };
  try {
    staleFinalReminders = await runStaleFinalPaymentCustomerReminders(admin);
  } catch (e) {
    console.error(LOG, 'stale final payment reminders failed', e);
  }

  for (const id of allIds) {
    const isLegacyOnly = !primary.includes(id);
    if (isLegacyOnly) {
      const ok = await reconcileBookingForFinalAutoCharge(admin, id);
      console.info(`${LOG} reconcile legacy candidate`, { bookingId: id, ok });
      if (!ok) continue;
    }

    console.info(`${LOG} attempt final charge`, { bookingId: id });
    const res = await attemptFinalCharge(admin, { bookingId: id });
    results.push({ id, ok: res.ok, code: res.code });
    if (res.ok) attempted++;
    console.info(`${LOG} attempt result`, { bookingId: id, ok: res.ok, code: res.code });
  }

  return NextResponse.json({
    attempted,
    candidates: allIds.length,
    resetStaleFinalProcessing: resetCount,
    staleFinalPaymentReminders: staleFinalReminders,
    sample: results.slice(0, 20),
  });
}
