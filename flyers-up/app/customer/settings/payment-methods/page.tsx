'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { AddPaymentMethodModal } from '@/components/billing/AddPaymentMethodModal';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { getCurrentUser } from '@/lib/api';

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export default function CustomerPaymentMethodsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    const res = await fetch('/api/stripe/customer/payment-methods', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setPaymentMethods([]);
      return;
    }
    setPaymentMethods(json.paymentMethods ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setUserId(user?.id ?? null);
        if (user) {
          await fetchMethods();
        } else {
          setPaymentMethods([]);
        }
      } catch {
        if (mounted) setPaymentMethods([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
  }, []);

  async function openAddModal() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/customer/setup-intent', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.clientSecret) {
        setSetupClientSecret(json.clientSecret);
        setAddModalOpen(true);
      }
    } finally {
      setActionLoading(false);
    }
  }

  function closeAddModal() {
    setAddModalOpen(false);
    setSetupClientSecret(null);
    void fetchMethods();
  }

  async function setDefault(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/customer/payment-methods/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      if (res.ok) await fetchMethods();
    } finally {
      setActionLoading(false);
    }
  }

  async function detach(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/customer/payment-methods/detach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      if (res.ok) await fetchMethods();
    } finally {
      setActionLoading(false);
    }
  }

  const isSignedIn = userId !== null;

  return (
    <AppLayout mode="customer">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Payment Methods</h1>
          <p className="text-sm text-muted mt-1">Add, remove, and pick a default card.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !isSignedIn ? (
          <SignInNotice nextHref="/customer/settings/payment-methods" />
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-base font-semibold text-text mb-4">Saved payment methods</h2>
              {paymentMethods.length === 0 ? (
                <div
                  className="rounded-2xl border border-black/10 p-6 text-center"
                  style={{ backgroundColor: '#F2F2F0' }}
                >
                  <p className="text-sm text-muted mb-4">No saved cards yet.</p>
                  <button
                    type="button"
                    onClick={() => void openAddModal()}
                    disabled={actionLoading}
                    className="h-11 px-5 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all"
                  >
                    Add a card
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <PaymentMethodCard
                      key={pm.id}
                      id={pm.id}
                      brand={pm.brand}
                      last4={pm.last4}
                      expMonth={pm.expMonth}
                      expYear={pm.expYear}
                      isDefault={pm.isDefault}
                      onSetDefault={() => void setDefault(pm.id)}
                      onRemove={() => void detach(pm.id)}
                      loading={actionLoading}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => void openAddModal()}
                    disabled={actionLoading}
                    className="w-full h-11 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all border-0"
                  >
                    Add new payment method
                  </button>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-base font-semibold text-text mb-4">Billing history</h2>
              <div
                className="rounded-2xl border border-black/10 p-6"
                style={{ backgroundColor: '#F2F2F0' }}
              >
                <p className="text-sm text-muted">No billing history yet.</p>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-text mb-4">Refund history</h2>
              <div
                className="rounded-2xl border border-black/10 p-6"
                style={{ backgroundColor: '#F2F2F0' }}
              >
                <p className="text-sm text-muted">No refunds yet.</p>
              </div>
            </section>
          </div>
        )}
      </div>

      {addModalOpen && setupClientSecret && (
        <AddPaymentMethodModal
          clientSecret={setupClientSecret}
          onSuccess={closeAddModal}
          onClose={closeAddModal}
        />
      )}
    </AppLayout>
  );
}
