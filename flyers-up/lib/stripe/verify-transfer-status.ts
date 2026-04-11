/**
 * Live Stripe read for Connect Transfers — pro payout UI accuracy only.
 */

import { stripe } from '@/lib/stripe';

export type VerifyTransferStatusResult = {
  exists: boolean;
  /** Stripe Transfer.status when retrieved; null if missing / error / Stripe off. */
  status: string | null;
};

export async function verifyTransferStatus(
  transferId: string | null | undefined
): Promise<VerifyTransferStatusResult> {
  const id = String(transferId ?? '').trim();
  if (!id || !stripe) {
    return { exists: false, status: null };
  }
  try {
    const t = await stripe.transfers.retrieve(id);
    const raw = t as unknown as { status?: string | null };
    const status = typeof raw.status === 'string' ? raw.status : null;
    return { exists: true, status };
  } catch (e) {
    console.warn('[verifyTransferStatus] retrieve failed', {
      id,
      message: e instanceof Error ? e.message : String(e),
    });
    return { exists: false, status: null };
  }
}
