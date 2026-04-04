'use client';

/**
 * Phone number + SMS OTP sign-in via Supabase Auth.
 *
 * PRODUCTION NOTES:
 * - SMS is sent by your Supabase project’s phone provider (e.g. Twilio) configured in the
 *   Supabase Dashboard under Authentication → Providers → Phone — not from this frontend.
 * - Add CAPTCHA / abuse protection (e.g. Supabase-supported CAPTCHA on sign-in) before scaling
 *   traffic if your project does not already enforce it; SMS OTP can be abused without it.
 * - Supabase rate-limits OTP requests; watch Auth logs and provider usage in the dashboard.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OTPInput } from '@/components/auth/OTPInput';
import { isValidPhone, toE164 } from '@/lib/auth/phone';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { supabase } from '@/lib/supabaseClient';

const TERMS_VERSION = '2026-01-27';
const RESEND_COOLDOWN_SEC = 60;

function formatNetworkError(err: unknown): string {
  if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
    return 'Network error. Try a different network or check your connection.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

/** Turn Supabase error text into shorter, friendlier copy where we can. */
function friendlyOtpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many requests. Please wait a few minutes and try again.';
  }
  if (m.includes('invalid') && m.includes('phone')) {
    return 'That phone number does not look valid. Check the number and try again.';
  }
  return message;
}

export type PhoneOtpFormProps = {
  /** Internal path from `?next=` — only same-origin paths starting with `/` are honored by routing. */
  nextPath?: string | null;
};

export function PhoneOtpForm({ nextPath }: PhoneOtpFormProps) {
  const router = useRouter();
  const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : null;

  // Step 1: collect digits; step 2: SMS code
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  // What the user types (we keep this when they tap “Change number”)
  const [phoneInput, setPhoneInput] = useState('');
  // E.164 saved after a successful “Send code” — used for verify + resend
  const [e164Phone, setE164Phone] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Count down resend cooldown one second at a time (avoids resetting a setInterval every tick).
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidPhone(phoneInput)) {
      setError('Enter a valid US mobile number (10 digits, with or without +1).');
      return;
    }

    const formatted = toE164(phoneInput);
    if (!formatted) {
      setError('Enter a valid US mobile number (10 digits, with or without +1).');
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          // Allow new accounts from this screen (same idea as email OTP signup elsewhere).
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        setError(friendlyOtpError(otpError.message));
        return;
      }

      setE164Phone(formatted);
      setStep('code');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(formatNetworkError(err));
      console.error('Phone OTP send error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading || !e164Phone) return;
    setError(null);
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: { shouldCreateUser: true },
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
      setError('Enter the full 6-digit code we texted you.');
      return;
    }
    if (!e164Phone) {
      setError('Start again: enter your phone number and request a new code.');
      setStep('phone');
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: code,
        type: 'sms',
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

      const profile = await getOrCreateProfile(data.user.id, data.user.email ?? null);
      if (!profile) {
        setError('Could not load your profile. Please try again.');
        return;
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
      console.error('Phone OTP verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    setError(null);
    setE164Phone(null);
  };

  const busy = loading;
  const canVerify = otp.replace(/\D/g, '').length === 6 && !busy;
  const canResend = resendCooldown === 0 && !busy && Boolean(e164Phone);

  return (
    <div className="space-y-4">
      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text">Enter your phone number</p>
            <p className="text-sm text-muted">We&apos;ll text you a 6-digit code</p>
          </div>

          <div>
            <label htmlFor="phone-otp-phone" className="block text-sm font-medium text-muted mb-1">
              Phone number
            </label>
            <input
              id="phone-otp-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phoneInput}
              onChange={(ev) => setPhoneInput(ev.target.value)}
              placeholder="(555) 123-4567"
              disabled={busy}
              className="w-full min-h-[48px] px-4 py-3 border border-border rounded-xl bg-surface text-text text-base placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors disabled:opacity-50"
            />
            <p className="mt-1.5 text-xs text-muted/80">US numbers only (10 digits).</p>
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
            <p className="text-sm font-medium text-text">We texted you a 6-digit code</p>
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
              aria-label="6-digit verification code"
            />
            <p className="mt-2 text-xs text-muted/80">Check your messages for the code.</p>
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
              onClick={handleChangeNumber}
              disabled={busy}
              className="text-left text-muted hover:text-text underline underline-offset-4 disabled:opacity-50"
            >
              Change number
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
