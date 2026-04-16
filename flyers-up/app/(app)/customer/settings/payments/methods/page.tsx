'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PaymentsSubpageShell } from '@/components/customer/payments/PaymentsSubpageShell';
import { PaymentHubHeader } from '@/components/customer/payments/PaymentHubHeader';
import { PrimaryPaymentMethodCard } from '@/components/customer/payments/PrimaryPaymentMethodCard';
import { SecondaryPaymentMethodRow } from '@/components/customer/payments/SecondaryPaymentMethodRow';
import { SecurityTrustCard } from '@/components/customer/payments/SecurityTrustCard';
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

function normalizePm(raw: Record<string, unknown>): PaymentMethod {
  return {
    id: String(raw.id),
    brand: String(raw.brand ?? 'card'),
    last4: String(raw.last4 ?? '0000'),
    expMonth: Number(raw.exp_month ?? raw.expMonth ?? 0),
    expYear: Number(raw.exp_year ?? raw.expYear ?? 0),
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
  };
}

export default function CustomerPaymentMethodsPage() {
  const searchParams = useSearchParams();
  const autoAddTriggered = useRef(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [cardholderHint, setCardholderHint] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    const res = await fetch('/api/stripe/customer/payment-methods', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMethods([]);
      return;
    }
    const list = Array.isArray(json.paymentMethods) ? json.paymentMethods.map((x: Record<string, unknown>) => normalizePm(x)) : [];
    setMethods(list);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setUserId(user?.id ?? null);
        const hint = user?.fullName?.trim() || user?.email?.split('@')[0] || '';
        setCardholderHint(hint.toUpperCase());
        if (user) await fetchMethods();
        else setMethods([]);
      } catch {
        if (mounted) setMethods([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchMethods]);

  const addFromBooking = searchParams.get('add') === '1';
  const signInNextHref =
    addFromBooking ? '/customer/settings/payments/methods?add=1' : '/customer/settings/payments/methods';

  const openAddModal = useCallback(async () => {
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
  }, []);

  /** Deep link from booking payment card (“Update payment method”) — opens add-card Stripe flow. */
  useEffect(() => {
    if (loading || !userId || autoAddTriggered.current || !addFromBooking) return;
    autoAddTriggered.current = true;
    void openAddModal();
  }, [loading, userId, addFromBooking, openAddModal]);

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

  const primary = methods.find((m) => m.isDefault) ?? methods[0];
  const others = primary ? methods.filter((m) => m.id !== primary.id) : [];

  return (
    <PaymentsSubpageShell backHref="/customer/settings/payments" backLabel="Payments">
      <PaymentHubHeader
        eyebrow="Financial hub"
        title="Manage your wallets."
        description="Securely manage your preferred payment methods for seamless checkout with local pros."
      />

      {loading ? (
        <p className="mt-8 text-sm text-text2">Loading…</p>
      ) : !userId ? (
        <div className="mt-8">
          <SignInNotice nextHref={signInNextHref} />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-8">
            {methods.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-surface2/50 px-6 py-12 text-center">
                <p className="text-base font-medium text-text">No saved payment methods yet</p>
                <p className="mt-2 text-sm text-text2">Add a card for faster checkout when you book.</p>
                <button
                  type="button"
                  onClick={() => void openAddModal()}
                  disabled={actionLoading}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[hsl(var(--accent-customer))] px-8 text-sm font-bold text-white shadow-lg hover:opacity-95 disabled:opacity-50"
                >
                  Add payment method
                </button>
              </div>
            ) : (
              <>
                {primary ? (
                  <PrimaryPaymentMethodCard
                    method={{
                      id: primary.id,
                      brand: primary.brand,
                      last4: primary.last4,
                      expMonth: primary.expMonth,
                      expYear: primary.expYear,
                      cardholderLabel: cardholderHint || undefined,
                    }}
                    onRemove={() => void detach(primary.id)}
                    loading={actionLoading}
                  />
                ) : null}

                {others.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-text">Other methods</h2>
                      <span className="text-xs font-medium text-text3">{methods.length} total</span>
                    </div>
                    <div className="space-y-3">
                      {others.map((m) => (
                        <SecondaryPaymentMethodRow
                          key={m.id}
                          method={{ ...m, type: 'card' }}
                          onSetDefault={() => void setDefault(m.id)}
                          onRemove={() => void detach(m.id)}
                          loading={actionLoading}
                        />
                      ))}
                    </div>
                    <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm italic text-text3">
                      Add multiple methods for backup billing.
                    </p>
                  </section>
                ) : null}

                <SecurityTrustCard />
              </>
            )}
          </div>

          {methods.length > 0 ? (
            <div
              className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4"
              style={{ bottom: 'max(0.75rem, calc(var(--fu-bottom-nav-chrome, 5rem) + 0.25rem))' }}
            >
              <button
                type="button"
                onClick={() => void openAddModal()}
                disabled={actionLoading}
                className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent-customer))] text-base font-bold text-white shadow-[0_8px_28px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </span>
                Add payment method
              </button>
            </div>
          ) : null}

          <div className={methods.length > 0 ? 'h-20' : ''} aria-hidden />
        </>
      )}

      {addModalOpen && setupClientSecret ? (
        <AddPaymentMethodModal clientSecret={setupClientSecret} onSuccess={closeAddModal} onClose={closeAddModal} />
      ) : null}
    </PaymentsSubpageShell>
  );
}
