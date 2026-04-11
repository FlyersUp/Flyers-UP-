'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MoneyPayoutPhase } from '@/lib/bookings/money-state';
import type { ProPayoutStripeSnapshot } from '@/lib/bookings/pro-payout-display';
import { proShouldFetchTransferStripeVerify } from '@/lib/bookings/pro-payout-display';

const empty: ProPayoutStripeSnapshot = {
  payoutTransferStripeStatus: null,
  payoutTransferStripeLiveChecked: false,
  payoutTransferIdPresent: false,
};

/**
 * Fetches live Stripe Transfer.status for the pro payout UI when money state needs transfer resolution.
 */
export function useProPayoutStripeVerify(
  bookingId: string,
  payoutPhase: MoneyPayoutPhase
): ProPayoutStripeSnapshot {
  const [snap, setSnap] = useState<ProPayoutStripeSnapshot>(empty);

  const shouldFetch = useMemo(() => proShouldFetchTransferStripeVerify(payoutPhase), [payoutPhase]);

  useEffect(() => {
    if (!shouldFetch) {
      setSnap(empty);
      return;
    }

    setSnap(empty);

    let cancelled = false;

    void fetch(`/api/bookings/${encodeURIComponent(bookingId)}/payout-transfer-verify`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{
          payoutTransferStripeStatus?: string | null;
          payoutTransferStripeLiveChecked?: boolean;
          payoutTransferIdPresent?: boolean;
        }>;
      })
      .then((j) => {
        if (cancelled || !j) return;
        setSnap({
          payoutTransferStripeStatus:
            typeof j.payoutTransferStripeStatus === 'string' ? j.payoutTransferStripeStatus : null,
          payoutTransferStripeLiveChecked: j.payoutTransferStripeLiveChecked === true,
          payoutTransferIdPresent: j.payoutTransferIdPresent === true,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSnap({
            payoutTransferStripeStatus: null,
            payoutTransferStripeLiveChecked: true,
            payoutTransferIdPresent: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, shouldFetch]);

  return snap;
}
