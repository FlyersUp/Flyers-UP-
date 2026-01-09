/**
 * Payout risk controls (scaffolding).
 *
 * IMPORTANT COMPLIANCE BOUNDARIES:
 * - These controls operate on payout risk/compliance signals only.
 * - Do NOT use immigration/citizenship/visa status. We do not collect it.
 *
 * This module is intentionally minimal and TODO-driven. Stripe Connect logic is stubbed.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export interface PayoutRiskState {
  proUserId: string;
  payoutsHoldDays: number;
  payoutsOnHold: boolean;
  reason: string | null;
}

/**
 * Evaluate whether payouts should be held for a pro.
 *
 * TODO: Integrate with Stripe disputes / chargebacks (webhooks) and payout scheduling.
 */
export async function evaluatePayoutRiskForPro(proUserId: string): Promise<PayoutRiskState> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from('pro_tax_profiles')
    .select('payouts_hold_days, payouts_on_hold')
    .eq('pro_user_id', proUserId)
    .maybeSingle();

  if (error || !data) {
    return {
      proUserId,
      payoutsHoldDays: 0,
      payoutsOnHold: false,
      reason: null,
    };
  }

  // TODO: determine if there is an active dispute for this pro’s payments.
  // For MVP scaffolding, we do not have a disputes table or Stripe webhook mapping in place.
  const hasActiveDispute = false;

  const payoutsOnHold = Boolean(data.payouts_on_hold) || hasActiveDispute;
  const payoutsHoldDays = Number(data.payouts_hold_days || 0);

  return {
    proUserId,
    payoutsHoldDays,
    payoutsOnHold,
    reason: hasActiveDispute ? 'active_dispute' : payoutsOnHold ? 'manual_hold' : null,
  };
}

/**
 * Apply dispute-based hold (stub).
 *
 * TODO: Wire to Stripe dispute events (Stripe webhook) and map disputes to pro_user_id.
 */
export async function applyDisputeHoldStub(params: {
  proUserId: string;
  hasActiveDispute: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { proUserId, hasActiveDispute } = params;
  const admin = createAdminSupabaseClient();

  // Only toggles payouts_on_hold. Does NOT move money.
  const { error } = await admin
    .from('pro_tax_profiles')
    .update({ payouts_on_hold: hasActiveDispute })
    .eq('pro_user_id', proUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}


