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
 * Integrates with stripe_disputes (populated by charge.dispute.created webhook) and pro_tax_profiles.
 */
export async function evaluatePayoutRiskForPro(proUserId: string): Promise<PayoutRiskState> {
  const admin = createAdminSupabaseClient();

  const [taxResult, disputeResult] = await Promise.all([
    admin.from('pro_tax_profiles').select('payouts_hold_days, payouts_on_hold').eq('pro_user_id', proUserId).maybeSingle(),
    admin.from('stripe_disputes').select('id').eq('pro_user_id', proUserId).eq('status', 'open').limit(1),
  ]);

  const taxData = taxResult.data;
  const hasActiveDispute = (disputeResult.data?.length ?? 0) > 0;

  if (taxResult.error || !taxData) {
    return {
      proUserId,
      payoutsHoldDays: 0,
      payoutsOnHold: hasActiveDispute,
      reason: hasActiveDispute ? 'active_dispute' : null,
    };
  }

  const payoutsOnHold = Boolean(taxData.payouts_on_hold) || hasActiveDispute;
  const payoutsHoldDays = Number(taxData.payouts_hold_days || 0);

  return {
    proUserId,
    payoutsHoldDays,
    payoutsOnHold,
    reason: hasActiveDispute ? 'active_dispute' : payoutsOnHold ? 'manual_hold' : null,
  };
}

/**
 * Apply or release dispute-based hold on pro payouts.
 * Called by Stripe webhook when disputes open/close.
 */
export async function applyDisputeHold(params: {
  proUserId: string;
  hasActiveDispute: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { proUserId, hasActiveDispute } = params;
  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from('pro_tax_profiles')
    .upsert(
      { pro_user_id: proUserId, payouts_on_hold: hasActiveDispute },
      { onConflict: 'pro_user_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
