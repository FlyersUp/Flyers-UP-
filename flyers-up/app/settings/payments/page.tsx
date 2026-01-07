'use client';

/**
 * Payment Settings Page
 * Allows users to manage payment methods and payout settings
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPayoutMethod, updatePayoutMethod } from '@/lib/api';

const PAYOUT_METHODS = [
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cashapp', label: 'CashApp' },
];

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'pro' | null>(null);
  
  const [payoutMethod, setPayoutMethod] = useState<'bank_account' | 'paypal' | 'cashapp'>('bank_account');
  const [accountLast4, setAccountLast4] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role as 'customer' | 'pro');

        // Load payout method if pro
        if (profile.role === 'pro') {
          const payout = await getPayoutMethod(user.id);
          if (payout) {
            setPayoutMethod(payout.method);
            setAccountLast4(payout.account_last4 || '');
          }
        }
      }
    } catch (err) {
      console.error('Error loading payment data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSavePayout(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    if (!accountLast4 || accountLast4.length < 4) {
      setError('Please enter the last 4 digits/characters of your account');
      setLoading(false);
      return;
    }

    try {
      const result = await updatePayoutMethod(userId, payoutMethod, accountLast4);
      if (result.success) {
        setSuccess('Payout method updated successfully');
      } else {
        setError(result.error || 'Failed to update payout method');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Settings</h1>
        <p className="text-gray-600">Manage payment methods and payout settings</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {userRole === 'pro' ? (
        <>
          {/* Pro Payout Settings */}
          <form onSubmit={handleSavePayout} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Method</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="payoutMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    id="payoutMethod"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as 'bank_account' | 'paypal' | 'cashapp')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {PAYOUT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="accountLast4" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Identifier (Last 4)
                  </label>
                  <input
                    type="text"
                    id="accountLast4"
                    value={accountLast4}
                    onChange={(e) => setAccountLast4(e.target.value)}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Last 4 digits or characters"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the last 4 digits of your account number or account identifier
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Payout Method'}
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Customer Payment Methods */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Payment Methods</h2>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-4">
                Manage your saved payment methods for faster checkout.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">No saved payment methods</p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed"
              >
                Add Payment Method (Coming Soon)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

