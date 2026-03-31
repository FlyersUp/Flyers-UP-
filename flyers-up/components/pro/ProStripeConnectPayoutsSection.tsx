'use client';

import { useCallback, useEffect, useState } from 'react';
import { TrustRow } from '@/components/ui/TrustRow';

type ConnectUiPhase = 'not_started' | 'pending_verification' | 'enabled' | 'disabled';

type StatusPayload = {
  ok: boolean;
  stripeConfigured?: boolean;
  phase?: ConnectUiPhase;
  accountId?: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
  bankName?: string | null;
  disabledReason?: string | null;
  error?: string;
};

const defaultReturnPath = '/pro/settings/payments-payouts';

export function ProStripeConnectPayoutsSection({
  returnPath = defaultReturnPath,
  variant = 'embedded',
}: {
  /** Where Stripe should send the user after Connect return (pathname + query ok). */
  returnPath?: string;
  /** `embedded` = under Payments & Payouts card; `page` = full settings/payments view */
  variant?: 'embedded' | 'page';
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/connect/account-status', { credentials: 'include', cache: 'no-store' });
      const json = (await res.json()) as StatusPayload;
      setData(json.ok ? json : { ok: false, error: json.error || 'Could not load payout status' });
    } catch {
      setData({ ok: false, error: 'Could not load payout status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const connect = new URLSearchParams(window.location.search).get('connect');
    if (connect === 'complete') {
      setBanner('Stripe setup looks complete. Charges and payouts are enabled.');
      void load();
    } else if (connect === 'pending') {
      setBanner('Stripe still needs a bit more information. Continue setup when you’re ready.');
      void load();
    } else if (connect === 'error' || connect === 'not_configured' || connect === 'missing_account') {
      setBanner(
        connect === 'not_configured'
          ? 'Stripe is not configured on this environment.'
          : connect === 'missing_account'
            ? 'No Connect account found yet. Start setup below.'
            : 'Something went wrong with Stripe. Try again or contact support.'
      );
    }
  }, [load]);

  const nextEncoded = encodeURIComponent(returnPath);
  const onboardHref = `/api/stripe/connect/onboard?next=${nextEncoded}`;
  const updateHref = `/api/stripe/connect/account-update?next=${nextEncoded}`;

  const phase = data?.phase ?? 'not_started';
  const stripeReady = data?.stripeConfigured !== false;

  const titleClass = variant === 'page' ? 'text-2xl font-bold text-text' : 'text-lg font-semibold text-text';
  const Heading = variant === 'page' ? 'h1' : 'h2';

  return (
    <div className="space-y-4">
      <div>
        <Heading className={`${titleClass} mb-2`}>
          {variant === 'page' ? 'Payment Settings' : 'Stripe payouts'}
        </Heading>
        <p className="text-sm text-muted">
          {variant === 'page'
            ? 'Payouts and tax verification run through Stripe Connect. We never collect your SSN or full bank details in Flyers Up.'
            : 'Bank account and tax details are entered only in Stripe’s secure onboarding—not here.'}
        </p>
        {variant === 'page' ? (
          <div className="mt-3">
            <TrustRow />
          </div>
        ) : null}
      </div>

      {banner ? (
        <div className="p-4 rounded-lg border border-border bg-surface2 text-sm text-text">{banner}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading payout status…</p>
      ) : !data?.ok ? (
        <div className="p-4 rounded-lg border border-danger/30 bg-danger/10 text-sm text-text">{data?.error}</div>
      ) : !stripeReady ? (
        <div className="p-4 rounded-lg border border-border bg-surface2 text-sm text-muted">
          Stripe is not configured. Payout setup is unavailable until the platform enables payments.
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                phase === 'enabled'
                  ? 'bg-[hsl(var(--accent-pro)/0.15)] border-[hsl(var(--accent-pro)/0.35)] text-text'
                  : phase === 'disabled'
                    ? 'bg-danger/10 border-danger/30 text-text'
                    : phase === 'not_started'
                      ? 'bg-surface2 text-muted border-border'
                      : 'bg-amber-500/10 border-amber-500/30 text-text'
              }`}
            >
              {phase === 'enabled' && 'Payouts enabled'}
              {phase === 'pending_verification' && 'Setup in progress'}
              {phase === 'not_started' && 'Not started'}
              {phase === 'disabled' && 'Restricted'}
            </span>
          </div>

          {phase === 'enabled' && (
            <div className="text-sm text-text space-y-1">
              <p>Your Connect account is active. Customer payments can be accepted for your jobs.</p>
              {(data.bankLast4 || data.bankName) && (
                <p className="text-muted">
                  Payout method:{' '}
                  <span className="font-medium text-text">
                    {data.bankName ? `${data.bankName} ` : ''}
                    {data.bankLast4 ? `····${data.bankLast4}` : data.bankName ? '' : 'On file with Stripe'}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted">
                Charges: {data.chargesEnabled ? 'on' : 'off'} · Payouts: {data.payoutsEnabled ? 'on' : 'off'}
              </p>
            </div>
          )}

          {phase === 'pending_verification' && (
            <p className="text-sm text-muted">
              Finish Stripe&apos;s steps to verify your identity and bank account. You can leave and come back anytime—use
              &quot;Continue setup&quot; to resume.
            </p>
          )}

          {phase === 'not_started' && (
            <p className="text-sm text-muted">
              Start Stripe Connect to receive payouts. You&apos;ll complete tax and banking in Stripe&apos;s flow—we only store
              your linked Stripe account ID.
            </p>
          )}

          {phase === 'disabled' && (
            <p className="text-sm text-muted">
              {data.disabledReason
                ? `Stripe reported an issue: ${data.disabledReason.replace(/_/g, ' ')}. Update your account to restore payouts.`
                : 'This Connect account needs attention in Stripe before payouts can resume.'}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {(phase === 'not_started' || phase === 'pending_verification') && (
              <a
                href={onboardHref}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-[hsl(var(--accent-pro))] hover:brightness-95 transition-all text-center"
              >
                {phase === 'not_started' ? 'Set up payouts' : 'Continue setup'}
              </a>
            )}
            {phase === 'disabled' && (
              <a
                href={updateHref}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-red-600 hover:bg-red-700 transition-colors text-center"
              >
                Fix in Stripe
              </a>
            )}
            {phase === 'enabled' && (
              <a
                href={updateHref}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold border-2 border-border text-text hover:bg-hover transition-colors text-center"
              >
                Update payout details
              </a>
            )}
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Flyers Up stores your Stripe Connect account ID and capability flags on your pro profile only. Sensitive data stays
            with Stripe.
          </p>
        </div>
      )}
    </div>
  );
}
