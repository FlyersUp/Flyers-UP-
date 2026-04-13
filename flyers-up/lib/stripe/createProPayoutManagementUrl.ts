import type Stripe from 'stripe';

export type ProPayoutManagementLinkKind = 'login_link' | 'account_link';

export type CreateProPayoutManagementUrlResult =
  | {
      ok: true;
      url: string;
      linkKind: ProPayoutManagementLinkKind;
      accountLinkType?: 'account_onboarding' | 'account_update';
    }
  | { ok: false; error: string; code: string };

const DEFAULT_RETURN = '/pro/settings/payments-payouts';

/** Prevent open redirects: only same-app pro paths. */
export function normalizeProStripeReturnPath(raw: string | null | undefined, fallback = DEFAULT_RETURN): string {
  const s = (raw && raw.trim()) || fallback;
  if (!s.startsWith('/')) return fallback;
  if (!s.startsWith('/pro/')) return fallback;
  if (s.includes('//')) return fallback;
  return s;
}

/**
 * Stripe-hosted URL for a Connect Express pro to manage payout/tax/bank details.
 * Prefer Express Dashboard (login link) when the account is healthy; otherwise Account Links.
 */
export async function createProPayoutManagementUrl(
  stripe: Stripe,
  opts: { accountId: string; origin: string; returnPath: string }
): Promise<CreateProPayoutManagementUrlResult> {
  const returnPath = normalizeProStripeReturnPath(opts.returnPath);
  const settingsAbs = new URL(returnPath, opts.origin).toString();

  let acct: Stripe.Account;
  try {
    acct = await stripe.accounts.retrieve(opts.accountId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not load Stripe account';
    return { ok: false, error: msg, code: 'stripe_retrieve_failed' };
  }

  const charges = acct.charges_enabled === true;
  const payouts = acct.payouts_enabled === true;
  const details = acct.details_submitted === true;
  const disabledReason = typeof acct.requirements?.disabled_reason === 'string' ? acct.requirements.disabled_reason.trim() : '';
  const currentlyDue = acct.requirements?.currently_due?.length ?? 0;
  const pastDue = acct.requirements?.past_due?.length ?? 0;
  const hasOutstandingRequirements = currentlyDue > 0 || pastDue > 0;

  const isExpress = acct.type === 'express';
  const loginEligible =
    isExpress &&
    details &&
    charges &&
    payouts &&
    !disabledReason &&
    !hasOutstandingRequirements;

  if (loginEligible) {
    try {
      const login = await stripe.accounts.createLoginLink(opts.accountId);
      if (login?.url) {
        return { ok: true, url: login.url, linkKind: 'login_link' };
      }
    } catch {
      /* fall through to account link */
    }
  }

  const linkType: 'account_onboarding' | 'account_update' = details ? 'account_update' : 'account_onboarding';

  try {
    const link = await stripe.accountLinks.create({
      account: opts.accountId,
      type: linkType,
      refresh_url: settingsAbs,
      return_url: settingsAbs,
    });
    if (!link?.url) {
      return { ok: false, error: 'Stripe did not return an account link URL.', code: 'missing_account_link_url' };
    }
    return { ok: true, url: link.url, linkKind: 'account_link', accountLinkType: linkType };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not create Stripe account link';
    return { ok: false, error: msg, code: 'account_link_failed' };
  }
}
