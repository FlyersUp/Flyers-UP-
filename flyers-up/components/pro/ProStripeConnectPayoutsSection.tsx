'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  isStripeConnectFullyActive,
  type StripeConnectUiState,
} from '@/lib/stripe/connectUiState';
import { TrustRow } from '@/components/ui/TrustRow';

type StatusPayload = {
  ok: boolean;
  stripeConfigured?: boolean;
  uiState?: StripeConnectUiState;
  accountId?: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
  bankName?: string | null;
  disabledReason?: string | null;
  /** Stripe requirements.currently_due / past_due (live retrieve). */
  outstandingRequirements?: boolean;
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [stripeLinkLoading, setStripeLinkLoading] = useState(false);
  const [stripeLinkError, setStripeLinkError] = useState<string | null>(null);

  /** Live Connect state from API — source of truth; URL ?connect= is only hints after redirects. */
  const isStripeConnected = useCallback((d: StatusPayload | null) => {
    if (!d?.ok) return false;
    if (d.uiState === 'connected') return true;
    return isStripeConnectFullyActive({
      accountId: d.accountId,
      chargesEnabled: d.chargesEnabled ?? false,
      payoutsEnabled: d.payoutsEnabled ?? false,
      detailsSubmitted: d.detailsSubmitted ?? false,
      disabledReason: d.disabledReason,
    });
  }, []);

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

  /**
   * Handle Stripe return query params only after we know account status.
   * If fully active, ignore stale ?connect=error (and similar) and strip the URL.
   */
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const connect = params.get('connect');
    const hadStripeQueryNoise =
      connect != null || params.has('refresh') || params.has('msg');
    if (!hadStripeQueryNoise) return;

    const clearHandledParamsFromUrl = () => {
      router.replace(returnPath.split('?')[0] || returnPath, { scroll: false });
    };

    const connected = isStripeConnected(data);

    if (connected) {
      setBanner(null);
      clearHandledParamsFromUrl();
      return;
    }

    if (connect === 'success' || connect === 'complete') {
      setBanner(
        'Stripe saved your return. If anything is still pending below, finish the remaining steps to enable payouts.'
      );
      void load();
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'pending') {
      setBanner('Stripe still needs a bit more information. Continue setup when you’re ready.');
      void load();
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'needs_action') {
      setBanner('Stripe needs more information or verification before payouts can go live. Use Continue setup or update your account.');
      void load();
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'error') {
      setBanner('Something went wrong with Stripe. Try again or contact support.');
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'not_configured') {
      setBanner('Stripe is not configured on this environment.');
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'missing_account' || connect === 'no_account') {
      setBanner('No Connect account found yet. Start setup below.');
      clearHandledParamsFromUrl();
      return;
    }
    if (connect === 'unauthorized') {
      setBanner('You need a pro account to set up payouts.');
      clearHandledParamsFromUrl();
      return;
    }

    if (params.has('refresh')) {
      void load();
      clearHandledParamsFromUrl();
      return;
    }

    clearHandledParamsFromUrl();
  }, [loading, data, returnPath, router, load, isStripeConnected]);

  const nextEncoded = encodeURIComponent(returnPath);
  const onboardHref = `/api/stripe/connect/onboard?next=${nextEncoded}`;

  const openStripePayoutManagement = useCallback(async () => {
    setStripeLinkError(null);
    setStripeLinkLoading(true);
    try {
      const res = await fetch('/api/pro/stripe/payout-update-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath }),
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        setStripeLinkError(json.error || 'Could not open Stripe. Try again or contact support.');
        return;
      }
      window.location.href = json.url;
    } catch {
      setStripeLinkError('Could not open Stripe. Check your connection and try again.');
    } finally {
      setStripeLinkLoading(false);
    }
  }, [returnPath]);

  const uiState: StripeConnectUiState = data?.uiState ?? 'not_started';
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

      {stripeLinkError ? (
        <div className="p-4 rounded-lg border border-danger/30 bg-danger/10 text-sm text-text">{stripeLinkError}</div>
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
                uiState === 'connected'
                  ? 'bg-[hsl(var(--accent-pro)/0.15)] border-[hsl(var(--accent-pro)/0.35)] text-text'
                  : uiState === 'needs_action'
                    ? 'bg-danger/10 border-danger/30 text-text'
                    : uiState === 'not_started'
                      ? 'bg-surface2 text-muted border-border'
                      : 'bg-amber-500/10 border-amber-500/30 text-text'
              }`}
            >
              {uiState === 'connected' && 'Payouts enabled'}
              {uiState === 'pending' && 'Finish Stripe setup'}
              {uiState === 'not_started' && 'Not started'}
              {uiState === 'needs_action' && 'Action required'}
            </span>
          </div>

          {uiState === 'connected' && (
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

          {uiState === 'pending' && (
            <p className="text-sm text-muted">
              Finish Stripe&apos;s steps to verify your identity and bank account. You can leave and come back anytime—use
              &quot;Continue setup&quot; to resume.
            </p>
          )}

          {uiState === 'not_started' && (
            <p className="text-sm text-muted">
              Set up payouts securely with Stripe. You&apos;ll enter tax and banking in Stripe&apos;s flow—we only store your
              linked Connect account ID.
            </p>
          )}

          {uiState === 'needs_action' && (
            <p className="text-sm text-muted">
              {data.disabledReason
                ? `Stripe reported an issue: ${data.disabledReason.replace(/_/g, ' ')}. Update your account to restore payouts.`
                : 'Stripe still needs information or verification before payouts can be enabled.'}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {(uiState === 'not_started' || uiState === 'pending') && (
              <a
                href={`/pro/connect?next=${nextEncoded}`}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-[hsl(var(--accent-pro))] hover:brightness-95 transition-all text-center"
              >
                {uiState === 'not_started' ? 'Set up payouts' : 'Continue setup'}
              </a>
            )}
            {uiState === 'needs_action' && (
              <>
                <button
                  type="button"
                  disabled={stripeLinkLoading}
                  onClick={() => void openStripePayoutManagement()}
                  className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-red-600 hover:bg-red-700 transition-colors text-center disabled:opacity-60 disabled:pointer-events-none"
                >
                  {stripeLinkLoading ? 'Opening Stripe…' : 'Fix in Stripe'}
                </button>
                <a
                  href={`/pro/connect?next=${nextEncoded}`}
                  className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold border-2 border-border text-text hover:bg-hover transition-colors text-center"
                >
                  Continue setup
                </a>
              </>
            )}
            {uiState === 'connected' && (
              <button
                type="button"
                disabled={stripeLinkLoading}
                onClick={() => void openStripePayoutManagement()}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold border-2 border-border text-text hover:bg-hover transition-colors text-center disabled:opacity-60 disabled:pointer-events-none"
              >
                {stripeLinkLoading
                  ? 'Opening Stripe…'
                  : data?.outstandingRequirements
                    ? 'Complete payout setup'
                    : 'Update payout details'}
              </button>
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
