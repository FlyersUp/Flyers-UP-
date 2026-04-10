'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { TrustRow } from '@/components/ui/TrustRow';

type CustomerVerificationStatusPayload = {
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPaymentMethod: boolean;
  identityStatus: 'not_started' | 'pending' | 'verified';
  phoneHint: string | null;
};

const ctaLinkClass =
  'inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-surface2 px-3.5 py-2 text-sm font-semibold text-text transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/25 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

type PillTone = 'verified' | 'pending' | 'not_started' | 'needs_attention';

function pillClass(tone: PillTone): string {
  switch (tone) {
    case 'verified':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/50';
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800/50';
    case 'needs_attention':
      return 'bg-red-50 text-red-800 border-red-200/60 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800/50';
    default:
      return 'bg-black/5 text-black/60 border-black/10 dark:bg-white/10 dark:text-white/70 dark:border-white/15';
  }
}

function pillLabel(tone: PillTone): string {
  switch (tone) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    case 'needs_attention':
      return 'Needs attention';
    default:
      return 'Not started';
  }
}

function VerificationRow({
  title,
  description,
  tone,
  action,
}: {
  title: string;
  description: string;
  tone: PillTone;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-text">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      <span
        className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass(tone)}`}
      >
        {pillLabel(tone)}
      </span>
    </div>
  );
}

export default function CustomerVerificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerVerificationStatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/customer/verification-status', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (!cancelled) setError((j as { error?: string }).error || 'Could not load verification status.');
          if (!cancelled) setData(null);
          return;
        }
        const json = (await res.json()) as CustomerVerificationStatusPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Something went wrong. Please try again.');
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const emailTone: PillTone = data?.emailVerified ? 'verified' : 'needs_attention';
  const phoneTone: PillTone = !data ? 'not_started' : data.phoneVerified ? 'verified' : 'not_started';
  const paymentTone: PillTone = !data ? 'not_started' : data.hasPaymentMethod ? 'verified' : 'not_started';
  const identityTone: PillTone =
    data?.identityStatus === 'verified'
      ? 'verified'
      : data?.identityStatus === 'pending'
        ? 'pending'
        : 'not_started';

  if (loading) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Verification</h1>
          <p className="text-muted/70 mt-4">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Verification</h1>
          <p className="text-muted mt-1">See what&apos;s verified on your account and finish anything that&apos;s missing.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text" role="alert">
            {error}
          </div>
        ) : null}

        <Card withRail>
          <Label>YOUR ACCOUNT</Label>
          <p className="text-sm text-muted mt-1">Trust signals we use for bookings and messaging.</p>

          <div className="mt-6 space-y-5">
            <VerificationRow
              title="Email"
              description="We use your email for sign-in, receipts, and important booking updates."
              tone={emailTone}
              action={
                !data?.emailVerified ? (
                  <Link href="/customer/settings/privacy-security" className={ctaLinkClass}>
                    Update info
                  </Link>
                ) : null
              }
            />

            <VerificationRow
              title="Phone"
              description={
                data?.phoneHint
                  ? `Number on file (${data.phoneHint}). Add or verify a phone number for faster account recovery and alerts.`
                  : 'Add a phone number for faster account recovery and SMS alerts when you opt in.'
              }
              tone={phoneTone}
              action={
                !data?.phoneVerified ? (
                  <Link href="/customer/settings/privacy-security" className={ctaLinkClass}>
                    Verify phone
                  </Link>
                ) : null
              }
            />

            <VerificationRow
              title="Identity verification"
              description="Government ID checks are not required for customers today. This may be offered for certain high-trust actions in the future."
              tone={identityTone}
              action={
                identityTone === 'not_started' ? (
                  <Link href="/trust-verification" className={ctaLinkClass}>
                    How verification works
                  </Link>
                ) : null
              }
            />

            <VerificationRow
              title="Payment method on file"
              description="A saved card speeds up checkout and pay flows. You can manage cards anytime."
              tone={paymentTone}
              action={
                !data?.hasPaymentMethod ? (
                  <Link href="/customer/settings/payments/methods" className={ctaLinkClass}>
                    Add payment method
                  </Link>
                ) : (
                  <Link href="/customer/settings/payments/methods" className={ctaLinkClass}>
                    Manage payment methods
                  </Link>
                )
              }
            />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
