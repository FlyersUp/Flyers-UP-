'use client';

/**
 * Payment Settings Page
 * - Pros: Stripe Connect payouts only (no manual tax/bank fields).
 * - Customers: saved payment methods (placeholders).
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';
import { ProStripeConnectPayoutsSection } from '@/components/pro/ProStripeConnectPayoutsSection';

export default function PaymentSettingsPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [userRole, setUserRole] = useState<'customer' | 'pro' | null>(null);

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
        if (mounted) setUserRole((profile?.role as 'customer' | 'pro') ?? null);
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
      </div>
    </div>
  );
}
