'use client';

/**
 * Email + 6-digit OTP sign-in via Supabase Auth (email OTP — not a magic link on this screen).
 *
 * PRODUCTION NOTES:
 * - Email delivery is configured in the Supabase Dashboard (SMTP or built-in) — no secrets here.
 * - Add CAPTCHA / abuse protection if your project does not already enforce it on sign-in.
 * - Supabase rate-limits OTP requests; monitor Auth settings and logs.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OTPInput } from '@/components/auth/OTPInput';
import { getOrCreateProfile, routeAfterAuth, upsertProfile } from '@/lib/onboarding';
import { trackGaEvent } from '@/lib/analytics/trackGa';
import { supabase } from '@/lib/supabaseClient';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';

const TERMS_VERSION = '2026-01-27';
const RESEND_COOLDOWN_SEC = 60;

function formatNetworkError(err: unknown): string {
  if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
    return 'Network error. Try a different network or check your connection.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

function friendlyOtpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many requests. Please wait a few minutes and try again.';
  }
  return message;
}

/** Basic check — good enough to catch typos before calling Supabase. */
function isValidEmail(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 5 || !t.includes('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export type EmailOtpFormProps = {
  nextPath?: string | null;
  /** When set (e.g. “Create account” on /signin), stored in metadata and applied to profile after verify. */
  createAccountRole?: 'customer' | 'pro';
};

function otpOptions(createAccountRole?: 'customer' | 'pro') {
  return {
    shouldCreateUser: true as const,
    ...(createAccountRole ? { data: { role: createAccountRole } } : {}),
  };
}

export function EmailOtpForm({ nextPath, createAccountRole }: EmailOtpFormProps) {
  const router = useRouter();
  const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : null;

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const trimmedEmail = emailInput.trim();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    // Apple App Review: reviewer account uses password on /signin — never send OTP to this inbox.
    if (isAppleAppReviewAccountEmail(trimmedEmail)) {
      setError(
        'This is the Apple App Review test account. Open /signin and sign in with email and password instead of requesting a code here.'
      );
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: otpOptions(createAccountRole),
      });

      if (otpError) {
        setError(friendlyOtpError(otpError.message));
        return;
      }

      setStep('code');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(formatNetworkError(err));
      console.error('Email OTP send error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading || !trimmedEmail) return;
    if (isAppleAppReviewAccountEmail(trimmedEmail)) {
      setError(
        'This is the Apple App Review test account. Use /signin with email and password instead of an email code.'
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: otpOptions(createAccountRole),
      });
      if (otpError) {
        setError(friendlyOtpError(otpError.message));
        return;
      }
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError('Enter the full 6-digit code from your email.');
      return;
    }
    if (!trimmedEmail) {
      setError('Start again: enter your email and request a new code.');
      setStep('email');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid')) {
          setError('That code is wrong or expired. Request a new code or try again.');
        } else {
          setError(friendlyOtpError(verifyError.message));
        }
        return;
      }

      if (!data.user) {
        setError('Verification worked but we could not start your session. Please try again.');
        return;
      }

      let profile = await getOrCreateProfile(data.user.id, data.user.email ?? trimmedEmail);
      if (!profile) {
        setError('Could not load your profile. Please try again.');
        return;
      }

      if (createAccountRole) {
        const profileRole =
          (data.user.user_metadata?.role as 'customer' | 'pro' | undefined) ?? createAccountRole;
        await upsertProfile({
          id: data.user.id,
          role: profileRole,
          onboarding_step: profileRole === 'pro' ? 'pro_profile' : 'customer_profile',
        });
        const refreshed = await getOrCreateProfile(data.user.id, data.user.email ?? trimmedEmail);
        if (refreshed) profile = refreshed;
        const createdMs = data.user.created_at ? new Date(data.user.created_at).getTime() : 0;
        if (createdMs && Date.now() - createdMs < 10 * 60 * 1000) {
          trackGaEvent('sign_up', { method: 'email' });
        }
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await fetch('/api/legal/acceptance', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ termsVersion: TERMS_VERSION }),
        });
      } catch {
        // non-blocking
      }

      const target = routeAfterAuth(profile, safeNext);
      if (target.startsWith('/api/')) window.location.href = target;
      else router.replace(target);
    } catch (err) {
      setError(formatNetworkError(err));
      console.error('Email OTP verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setError(null);
  };

  const busy = loading;
  const canVerify = otp.replace(/\D/g, '').length === 6 && !busy;
  const canResend = resendCooldown === 0 && !busy && Boolean(trimmedEmail);

  return (
    <div className="space-y-4">
      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text">Enter your email</p>
            <p className="text-sm text-muted">We&apos;ll email you a 6-digit code</p>
          </div>

          <div>
            <label htmlFor="email-otp-email" className="block text-sm font-medium text-muted mb-1">
              Email
            </label>
            <input
              id="email-otp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={emailInput}
              onChange={(ev) => setEmailInput(ev.target.value)}
              placeholder="you@example.com"
              disabled={busy}
              className="w-full min-h-[48px] px-4 py-3 border border-border rounded-xl bg-surface text-text text-base placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text">We emailed you a 6-digit code</p>
            <p className="text-sm text-muted">Enter the code to continue</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">6-digit code</label>
            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
              disabled={busy}
              autoFocus
              aria-label="6-digit email verification code"
            />
            <p className="mt-2 text-xs text-muted/80">Sent to {trimmedEmail}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
          )}

          <button
            type="submit"
            disabled={!canVerify}
            className="w-full min-h-[48px] rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Verifying…' : 'Verify code'}
          </button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={busy}
              className="text-left text-muted hover:text-text underline underline-offset-4 disabled:opacity-50"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={!canResend}
              className="text-left sm:text-right font-medium text-text hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
