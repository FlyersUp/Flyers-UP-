/**
 * Shared copy + classification for admin “approve / retry payout” POST responses.
 * Keeps {@link ApprovePayoutNowButton} and any future payout surfaces aligned.
 */

export type ApprovePayoutReleaseOutcome = 'transfer_settled' | 'transfer_initiated' | 'queued';

export type ApprovePayoutResponseJson = {
  ok?: boolean;
  message?: string;
  code?: string;
  error?: string;
  errorPhase?: 'eligibility' | 'pre_stripe' | 'stripe' | 'validation';
  details?: unknown;
  transferId?: string | null;
  releaseOutcome?: ApprovePayoutReleaseOutcome | null;
  stripeTransferStatus?: string | null;
  amountTransferredCents?: number;
};

export type ResolveApprovePayoutResult =
  | { type: 'ok'; text: string; shouldNotifyParent: boolean }
  | { type: 'err'; text: string };

export function resolveApprovePayoutMessage(
  res: Response,
  json: ApprovePayoutResponseJson | Record<string, unknown>
): ResolveApprovePayoutResult {
  const j = json as ApprovePayoutResponseJson;

  if (res.ok && j.ok !== false) {
    const explicit = typeof j.message === 'string' && j.message.trim() ? j.message.trim() : null;
    const outcome = (j.releaseOutcome ?? null) as ApprovePayoutReleaseOutcome | null;

    if (explicit) {
      return {
        type: 'ok',
        text: explicit,
        shouldNotifyParent: outcome !== 'queued',
      };
    }

    if (outcome === 'queued') {
      return {
        type: 'ok',
        text: 'Payout release was accepted and will process in the background.',
        shouldNotifyParent: false,
      };
    }

    if (outcome === 'transfer_initiated') {
      return {
        type: 'ok',
        text: 'Payout recorded and release started.',
        shouldNotifyParent: true,
      };
    }

    // transfer_settled, legacy responses without releaseOutcome, or unknown → treat as settled.
    return {
      type: 'ok',
      text: 'Payout released successfully.',
      shouldNotifyParent: true,
    };
  }

  const apiMessage =
    typeof j.message === 'string' && j.message.trim().length > 0 ? j.message.trim() : null;
  if (apiMessage) {
    return { type: 'err', text: apiMessage };
  }

  const code =
    (typeof j.code === 'string' ? j.code : null) ??
    (typeof j.error === 'string' ? j.error : null) ??
    (res.statusText?.trim() ? res.statusText : null) ??
    'release_failed';

  const phase = typeof j.errorPhase === 'string' ? j.errorPhase : null;
  const raw = String(code);

  const isStripeFailure = phase === 'stripe' || (!phase && raw === 'transfer_failed');

  if (isStripeFailure) {
    return {
      type: 'err',
      text: 'Stripe could not complete the transfer. Check the pro’s Connect account and retry.',
    };
  }

  const friendly: Record<string, string> = {
    no_destination: 'No Stripe Connect destination on file — the pro must finish payout setup first.',
    already_released: 'This booking already has a payout recorded.',
    zero_amount: 'The payout amount is zero — review booking totals and refunds.',
    payout_blocked: 'This payout is still blocked by review policy or dispute state.',
    unknown_action: 'The server did not recognize this action. Refresh and try again.',
    invalid_booking_id: 'This booking link is invalid.',
    invalid_json: 'The request payload was invalid.',
  };

  return { type: 'err', text: friendly[raw] ?? 'Payout could not be released right now.' };
}
