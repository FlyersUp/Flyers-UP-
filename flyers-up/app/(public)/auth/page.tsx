'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import AuthLoadingFallback from '@/components/AuthLoadingFallback';
import { OTPInput } from '@/components/auth/OTPInput';
import { AuthSocialButton } from '@/components/auth/AuthSocialButton';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { toE164, formatDisplay, isValidPhone } from '@/lib/auth/phone';
import { useRouter } from 'next/navigation';
import { Phone, Mail } from 'lucide-react';

const TERMS_VERSION = '2026-01-27';
const AUTH_EMAIL_KEY = 'flyersup:auth_email';
const AUTH_PHONE_KEY = 'flyersup:auth_phone';
const RESEND_COOLDOWN_SEC = 30;

type Step = 'entry' | 'phone' | 'email' | 'code';
type OtpChannel = 'email' | 'sms';
type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

function AuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const deniedParam = searchParams.get('denied');

  const [step, setStep] = useState<Step>('entry');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [adminDenied, setAdminDenied] = useState<{ email: string; role: string | null } | null>(null);

  const redirectTo = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/auth/callback`;
    if (nextParam && nextParam.startsWith('/')) {
      return `${base}?next=${encodeURIComponent(nextParam)}`;
    }
    return base;
  }, [nextParam]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_EMAIL_KEY);
      if (stored?.trim()) setEmail(stored.trim());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if ((step === 'code' && email.trim()) || (step === 'code' && phone.trim())) {
      try {
        if (otpChannel === 'email') sessionStorage.setItem(AUTH_EMAIL_KEY, email.trim());
        else sessionStorage.setItem(AUTH_PHONE_KEY, phone);
      } catch {
        /* ignore */
      }
    }
  }, [step, email, phone, otpChannel]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (cancelled || !profile) return;
        if (deniedParam === '1') {
          setAdminDenied({ email: user.email ?? '', role: profile?.role ?? null });
          return;
        }
        const target = routeAfterAuth(profile, nextParam);
        if (target.startsWith('/api/')) window.location.href = target;
        else router.replace(target);
      } catch {
        /* ignore */
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router, nextParam, deniedParam]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function formatCatch(err: unknown): string {
    if (err instanceof Error) {
      const msg = err.message || 'Unknown error';
      if (msg.toLowerCase().includes('failed to fetch')) {
        return 'Network error. Try a different network.';
      }
      return msg;
    }
    return 'Something went wrong. Please try again.';
  }

  const handleSendEmailCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = email.trim();
      if (!isValidEmail(trimmed)) {
        setError('Please enter a valid email address.');
        return;
      }
      setStatus('sending');
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
        });
        if (otpError) {
          setStatus('error');
          setError(otpError.message);
          return;
        }
        setOtpChannel('email');
        setStatus('sent');
        setOtp('');
        setStep('code');
        setResendCooldown(RESEND_COOLDOWN_SEC);
      } catch (err) {
        setStatus('error');
        setError(formatCatch(err));
      }
    },
    [email, redirectTo]
  );

  const handleSendPhoneCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const e164 = toE164(phone);
      if (!e164) {
        setError('Please enter a valid US phone number (10 digits).');
        return;
      }
      setStatus('sending');
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
        if (otpError) {
          setStatus('error');
          setError(otpError.message);
          return;
        }
        setOtpChannel('sms');
        setStatus('sent');
        setOtp('');
        setStep('code');
        setResendCooldown(RESEND_COOLDOWN_SEC);
      } catch (err) {
        setStatus('error');
        setError(formatCatch(err));
      }
    },
    [phone]
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setStatus('sending');
    try {
      if (otpChannel === 'email') {
        const trimmed = email.trim();
        if (!trimmed) return;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
        });
        if (otpError) {
          setStatus('error');
          setError(otpError.message);
          return;
        }
      } else {
        const e164 = toE164(phone);
        if (!e164) return;
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
        if (otpError) {
          setStatus('error');
          setError(otpError.message);
          return;
        }
      }
      setStatus('sent');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setStatus('error');
      setError(formatCatch(err));
    }
  }, [otpChannel, email, phone, redirectTo, resendCooldown]);

  const handleVerifyCode = useCallback(
    async (code: string) => {
      setError(null);
      if (code.length !== 6) return;
      setStatus('verifying');
      try {
        type VerifyResult = Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data'];
        let data: VerifyResult | null = null;
        if (otpChannel === 'email') {
          const trimmed = email.trim();
          if (!trimmed) {
            setStatus('error');
            setError('No email on file. Go back and enter your email.');
            return;
          }
          const result = await supabase.auth.verifyOtp({
            email: trimmed,
            token: code,
            type: 'email',
          });
          data = result.data as VerifyResult;
          if (result.error) {
            setStatus('error');
            setError(result.error.message.toLowerCase().includes('expired') || result.error.message.toLowerCase().includes('invalid')
              ? 'That code is invalid or expired. Request a new code below.'
              : result.error.message);
            return;
          }
        } else {
          const e164 = toE164(phone);
          if (!e164) {
            setStatus('error');
            setError('No phone on file. Go back and enter your number.');
            return;
          }
          const result = await supabase.auth.verifyOtp({
            phone: e164,
            token: code,
            type: 'sms',
          });
          data = result.data as VerifyResult;
          if (result.error) {
            setStatus('error');
            setError(result.error.message.toLowerCase().includes('expired') || result.error.message.toLowerCase().includes('invalid')
              ? 'That code is invalid or expired. Request a new code below.'
              : result.error.message);
            return;
          }
        }

        if (data?.session?.access_token && data?.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        const user = data?.user;
        if (!user) {
          setStatus('error');
          setError('Could not finish signing you in. Please try again.');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setError('We verified your code, but couldn\'t establish a session. Try disabling private browsing or allow site storage.');
          return;
        }

        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (!profile) {
          setStatus('error');
          setError('Could not load your profile. Please try again.');
          return;
        }

        try {
          const { data: { session: s } } = await supabase.auth.getSession();
          await fetch('/api/legal/acceptance', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(s?.access_token ? { authorization: `Bearer ${s.access_token}` } : {}),
            },
            body: JSON.stringify({ termsVersion: TERMS_VERSION }),
          });
        } catch {
          /* ignore */
        }

        try {
          sessionStorage.removeItem(AUTH_EMAIL_KEY);
          sessionStorage.removeItem(AUTH_PHONE_KEY);
        } catch {
          /* ignore */
        }

        const target = routeAfterAuth(profile, nextParam);
        if (target.startsWith('/api/')) window.location.href = target;
        else router.replace(target);
      } catch (err) {
        setStatus('error');
        setError(formatCatch(err));
      }
    },
    [otpChannel, email, phone, nextParam, router]
  );

  const handleOtpChange = useCallback((val: string) => {
    setOtp(val);
  }, []);

  const handleGoogle = useCallback(async () => {
    setError(null);
    setStatus('sending');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) {
        setStatus('error');
        setError(oauthError.message);
      }
    } catch (err) {
      setStatus('error');
      setError(formatCatch(err));
    }
  }, [redirectTo]);

  const handleApple = useCallback(async () => {
    setError(null);
    setStatus('sending');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });
      if (oauthError) {
        setStatus('error');
        setError(oauthError.message);
      }
    } catch (err) {
      setStatus('error');
      setError(formatCatch(err));
    }
  }, [redirectTo]);

  const goBackToEntry = useCallback(() => {
    setStep('entry');
    setStatus('idle');
    setError(null);
  }, []);

  const goBackToContact = useCallback(() => {
    setStep(otpChannel === 'email' ? 'email' : 'phone');
    setStatus('idle');
    setError(null);
    setOtp('');
  }, [otpChannel]);

  const contactDisplay = otpChannel === 'email' ? email.trim() : formatDisplay(phone);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <div className="min-h-screen flex flex-col">
        <header className="px-4 py-5">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Logo size="md" linkToHome />
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-muted hover:text-text transition-colors"
            >
              Back
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-10">
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="p-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Find local help without the guesswork.
                </h1>
                <p className="text-muted mt-2">
                  Sign in to browse pros, send a request, and message on-platform. You can add details later.
                </p>

                {adminDenied && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-4 text-sm text-text">
                    <p className="font-semibold">Admin access denied</p>
                    <p className="mt-1 text-muted">
                      You're signed in as <span className="font-mono text-text">{adminDenied.email || '(no email)'}</span>
                      {adminDenied.role != null && <span> (role: <span className="font-mono">{adminDenied.role}</span>)</span>}.
                    </p>
                    <p className="mt-2 text-muted">
                      To get admin access: set your account's <strong>role</strong> to <code>admin</code> in Supabase, or add your email to <code>ADMIN_EMAILS</code>.
                    </p>
                    <Link
                      href={adminDenied.role === 'pro' ? '/pro' : '/customer'}
                      className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accentContrast hover:opacity-95"
                    >
                      Go to my dashboard
                    </Link>
                    <span className="mx-2 text-muted">·</span>
                    <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
                      Try admin again
                    </Link>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">
                    {error}
                  </div>
                )}

                {/* Entry: Phone, Google, Apple, Email */}
                {step === 'entry' && (
                  <div className="mt-6 space-y-3 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setError(null); }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      <Phone size={20} className="text-muted" />
                      Continue with Phone
                    </button>

                    <AuthSocialButton provider="google" label="Continue with Google" onClick={handleGoogle} disabled={status === 'sending' || status === 'verifying'} />
                    <AuthSocialButton provider="apple" label="Continue with Apple" onClick={handleApple} disabled={status === 'sending' || status === 'verifying'} />

                    <button
                      type="button"
                      onClick={() => { setStep('email'); setError(null); }}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      <Mail size={20} className="text-muted" />
                      Continue with Email
                    </button>

                    <div className="pt-2 text-sm text-muted">
                      Pro account?{' '}
                      <Link href={nextParam ? `/signin?next=${encodeURIComponent(nextParam)}` : '/signin'} className="text-text hover:opacity-80 font-medium">
                        Sign in with email & password
                      </Link>
                    </div>
                  </div>
                )}

                {/* Phone input */}
                {step === 'phone' && (
                  <form onSubmit={handleSendPhoneCode} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="auth-phone" className="block text-sm font-medium text-muted mb-1">
                        Phone number
                      </label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                      <p className="mt-1 text-xs text-muted">US numbers only. We'll send a 6-digit code via SMS.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'sending' || !isValidPhone(phone)}
                      className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                    >
                      {status === 'sending' ? 'Sending…' : 'Send code'}
                    </button>
                    <button type="button" onClick={goBackToEntry} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-medium hover:bg-surface2 transition-colors">
                      Back
                    </button>
                  </form>
                )}

                {/* Email input */}
                {step === 'email' && (
                  <form onSubmit={handleSendEmailCode} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="auth-email" className="block text-sm font-medium text-muted mb-1">
                        Email
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                      <p className="mt-1 text-xs text-muted">We'll email you a 6-digit code. No password needed.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'sending' || !email.trim()}
                      className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                    >
                      {status === 'sending' ? 'Sending…' : 'Send code'}
                    </button>
                    <button type="button" onClick={goBackToEntry} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-medium hover:bg-surface2 transition-colors">
                      Back
                    </button>
                  </form>
                )}

                {/* OTP code entry */}
                {step === 'code' && (
                  <div className="mt-6">
                    <div className="rounded-xl border border-border bg-surface2 px-4 py-4">
                      <div className="font-medium text-text">
                        {otpChannel === 'email' ? 'Enter the 6-digit code we emailed you' : 'Enter the 6-digit code we texted you'}
                      </div>
                      <div className="text-sm text-muted mt-1">
                        We sent a code to <span className="font-medium text-text">{contactDisplay}</span>. Code expires soon.
                      </div>
                      <p className="text-xs text-muted mt-2">
                        Didn't get it? Check {otpChannel === 'email' ? 'spam or promotions' : 'your messages'}, or resend below.
                      </p>

                      <div className="mt-4 space-y-3">
                        <OTPInput
                          value={otp}
                          onChange={handleOtpChange}
                          onComplete={handleVerifyCode}
                          disabled={status === 'verifying'}
                          aria-label="6-digit code"
                          aria-describedby="otp-hint"
                        />
                        <p id="otp-hint" className="sr-only">Enter the 6-digit code. Auto-submits when complete.</p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleResend()}
                          disabled={status === 'sending' || status === 'verifying' || resendCooldown > 0}
                          className="rounded-xl bg-surface border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : status === 'sending' ? 'Sending…' : 'Resend code'}
                        </button>
                        <button
                          type="button"
                          onClick={goBackToContact}
                          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface2 transition-colors"
                        >
                          {otpChannel === 'email' ? 'Change email' : 'Change number'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-muted/70 leading-relaxed">
              By continuing, you agree to keep communication on-platform and follow our Terms.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthInner />
    </Suspense>
  );
}
