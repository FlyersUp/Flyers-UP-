'use client';

/**
 * Payment Settings Page
 * - Pros: Stripe Connect payouts only (no manual tax/bank fields).
 * - Customers: saved payment methods (placeholders).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';
import { ProStripeConnectPayoutsSection } from '@/components/pro/ProStripeConnectPayoutsSection';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';
import { isStripeTestPublishableKey } from '@/lib/stripe/isStripeTestPublishableKey';
import { AppReviewTestPaymentBanner } from '@/components/apple-review/AppReviewTestPaymentBanner';

export default function PaymentSettingsPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [userRole, setUserRole] = useState<'customer' | 'pro' | null>(null);
  const [isReviewCustomer, setIsReviewCustomer] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) {
          if (mounted) setUserRole(null);
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = (profile?.role as 'customer' | 'pro') ?? null;
        if (mounted) {
          setUserRole(role);
          setIsReviewCustomer(role === 'customer' && isAppleAppReviewAccountEmail(user.email));
        }
      } catch {
        if (mounted) setUserRole(null);
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-muted/70">Loading...</div>
      </div>
    );
  }

  if (userRole === 'pro') {
    return (
      <div className="space-y-6">
        <ProStripeConnectPayoutsSection variant="page" returnPath="/pro/settings/payments" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Payment Settings</h1>
        <p className="text-muted">Manage payment methods and payout settings</p>
        <div className="mt-3">
          <TrustRow />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text mb-4">Saved Payment Methods</h2>
        {isReviewCustomer ? (
          <div className="p-4 bg-surface2 border border-border rounded-lg space-y-3">
            {isStripeTestPublishableKey() ? (
              <AppReviewTestPaymentBanner />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-semibold">Apple App Review account</p>
                <p className="mt-1 text-xs opacity-90">
                  This build should use Stripe test keys (pk_test_…) for review. Saved cards are not required — pay from
                  a booking&apos;s deposit or checkout screen when the app is in test mode.
                </p>
              </div>
            )}
            <p className="text-sm text-muted">
              Saved cards are not required for App Store review. Open a booking that needs a deposit and complete
              checkout there (with Stripe test keys, use test card 4242 4242 4242 4242).
            </p>
            <Link
              href="/customer/bookings"
              className="inline-flex text-sm font-medium text-accent hover:underline underline-offset-4"
            >
              Go to My Bookings →
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-surface2 border border-border rounded-lg">
            <p className="text-sm text-muted mb-4">Manage your saved payment methods for faster checkout.</p>
            <div className="space-y-3">
              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-sm text-muted/70">No saved payment methods</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 px-4 py-2 bg-surface border border-border text-muted rounded-lg cursor-not-allowed"
            >
              Add Payment Method (Coming Soon)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
