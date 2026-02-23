/**
 * Stripe Connect Sample Integration
 *
 * Uses Stripe Client for all requests. Supports:
 * - V2 Connected Accounts (platform responsible for fees)
 * - Account onboarding via Account Links
 * - Destination charges + app fee (booking checkout uses lib/stripe)
 *
 * PLACEHOLDER: Set STRIPE_SECRET_KEY in .env.local
 * Get keys at https://dashboard.stripe.com/apikeys
 *
 * Error handling: All functions return { error: string } when Stripe is not
 * configured; caller should check and show a helpful message to the user.
 */

import Stripe from 'stripe';

// ============================================
// STRIPE CLIENT
// ============================================
// All Stripe requests use this client. Never expose the secret key to the client.
// Throws if STRIPE_SECRET_KEY is missing; getStripeConnectClient() returns null instead.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.trim() === '') {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local from https://dashboard.stripe.com/apikeys'
    );
  }
  // SDK uses latest API version automatically (e.g. 2026-01-28.clover)
  return new Stripe(STRIPE_SECRET_KEY);
}

// Lazy singleton - avoids throwing at import time
let _stripeClient: Stripe | null = null;

export function getStripeConnectClient(): Stripe | null {
  try {
    if (!_stripeClient) _stripeClient = getStripeClient();
    return _stripeClient;
  } catch {
    return null;
  }
}

// ============================================
// V2 CONNECTED ACCOUNTS
// ============================================
// Platform is responsible for pricing and fee collection.
// Uses Stripe REST API v2/core/accounts (SDK may use stripe.request for v2).
// Full object: https://docs.stripe.com/api/v2/core/accounts/object

export interface CreateConnectedAccountParams {
  displayName: string;
  contactEmail: string;
  country?: string;
}

export async function createConnectedAccountV2(
  params: CreateConnectedAccountParams
): Promise<{ accountId: string } | { error: string }> {
  const stripeClient = getStripeConnectClient();
  if (!stripeClient) {
    return { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local' };
  }

  try {
    // V2 API: create account with platform as fees_collector and losses_collector
    // Do NOT pass type at top level (no type: 'express' | 'standard' | 'custom')
    const account = await (stripeClient as any).v2?.core?.accounts?.create?.({
      display_name: params.displayName,
      contact_email: params.contactEmail,
      identity: { country: params.country ?? 'us' },
      dashboard: 'express',
      defaults: {
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
    });

    if (!account?.id) {
      return { error: 'Failed to create Stripe account' };
    }
    return { accountId: account.id };
  } catch (err: any) {
    // Fallback: if v2 not available in SDK, use raw request
    if (err?.code === 'STRIPE_ERROR' || err?.message?.includes('v2')) {
      const res = await fetch('https://api.stripe.com/v2/core/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'display_name': params.displayName,
          'contact_email': params.contactEmail,
          'identity[country]': params.country ?? 'us',
          'dashboard': 'express',
          'defaults[responsibilities][fees_collector]': 'application',
          'defaults[responsibilities][losses_collector]': 'application',
          'configuration[recipient][capabilities][stripe_balance][stripe_transfers][requested]': 'true',
        }).toString(),
      });
      const data = await res.json();
      if (data.error) return { error: data.error.message || 'Failed to create account' };
      return { accountId: data.id };
    }
    return { error: err?.message ?? 'Failed to create connected account' };
  }
}

// ============================================
// V2 ACCOUNT LINKS (Onboarding)
// ============================================

export async function createAccountLinkV2(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<{ url: string } | { error: string }> {
  const stripeClient = getStripeConnectClient();
  if (!stripeClient) return { error: 'Stripe is not configured' };

  try {
    const link = await (stripeClient as any).v2?.core?.accountLinks?.create?.({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          refresh_url: refreshUrl,
          return_url: returnUrl,
        },
      },
    });

    if (!link?.url) {
      const res = await fetch('https://api.stripe.com/v2/core/account_links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: accountId,
          use_case: {
            type: 'account_onboarding',
            account_onboarding: {
              configurations: ['recipient'],
              refresh_url: refreshUrl,
              return_url: returnUrl,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error.message ?? 'Failed to create link' };
      return { url: data.url };
    }
    return { url: link.url };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create account link' };
  }
}

// ============================================
// V2 ACCOUNT STATUS (from API, not DB)
// ============================================

export async function getAccountStatusV2(accountId: string): Promise<{
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus?: string;
  error?: string;
}> {
  const stripeClient = getStripeConnectClient();
  if (!stripeClient) {
    return { readyToReceivePayments: false, onboardingComplete: false, error: 'Stripe is not configured' };
  }

  try {
    const account = await (stripeClient as any).v2?.core?.accounts?.retrieve?.(accountId, {
      include: ['configuration.recipient', 'requirements'],
    });

    if (!account) {
      const res = await fetch(`https://api.stripe.com/v2/core/accounts/${accountId}?include[]=configuration.recipient&include[]=requirements`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const data = await res.json();
      if (data.error) return { readyToReceivePayments: false, onboardingComplete: false, error: data.error.message };
      const acc = data;
      const readyToReceivePayments =
        acc?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
      const requirementsStatus = acc?.requirements?.summary?.minimum_deadline?.status;
      const onboardingComplete =
        requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';
      return { readyToReceivePayments, onboardingComplete, requirementsStatus };
    }

    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
    const requirementsStatus = account?.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';
    return { readyToReceivePayments, onboardingComplete, requirementsStatus };
  } catch (err: any) {
    return { readyToReceivePayments: false, onboardingComplete: false, error: err?.message };
  }
}
