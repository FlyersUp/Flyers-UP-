'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { useRouter } from 'next/navigation';

const TERMS_VERSION = '2026-01-27';
const AUTH_EMAIL_KEY = 'flyersup:auth_email';
const RESEND_COOLDOWN_SEC = 30;

type Step = 'entry' | 'email' | 'code';
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

  const [step, setStep] = useState<Step>('entry');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [supabaseReachability, setSupabaseReachability] = useState<'checking' | 'ok' | 'blocked'>('checking');
  const otpInputRef = useRef<HTMLInputElement>(null);

  const redirectTo = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/auth/callback`;
    if (nextParam && nextParam.startsWith('/')) {
      return `${base}?next=${encodeURIComponent(nextParam)}`;
    }
    return base;
  }, [nextParam]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!anonKey) {
          if (!cancelled) setSupabaseReachability('blocked');
          return;
        }
        const res = await fetch('/api/supabase/auth/v1/health', {
          method: 'GET',
          headers: {
            apikey: anonKey,
            authorization: `Bearer ${anonKey}`,
          },
          cache: 'no-store',
        });
        if (!cancelled) setSupabaseReachability(res.ok ? 'ok' : 'blocked');
      } catch {
        if (!cancelled) setSupabaseReachability('blocked');
      }
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  // Restore email from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_EMAIL_KEY);
      if (stored && stored.trim()) {
        setEmail(stored.trim());
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist email when we move to code step
  useEffect(() => {
    if (step === 'code' && email.trim()) {
      try {
        sessionStorage.setItem(AUTH_EMAIL_KEY, email.trim());
      } catch {
        // ignore
      }
    }
  }, [step, email]);

  // Already signed in: redirect away
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (cancelled || !profile) return;
        router.replace(routeAfterAuth(profile, nextParam));
      } catch {
        // ignore
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router, nextParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function formatCatch(err: unknown): string {
    if (err instanceof Error) {
      const msg = err.message || 'Unknown error';
      if (msg.toLowerCase().includes('failed to fetch')) {
        return 'Network error reaching Supabase. Try a VPN or a different network.';
      }
      return msg;
    }
    return 'Something went wrong. Please try again.';
  }

  const handleSendCode = useCallback(
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
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
          },
        });

        if (otpError) {
          setStatus('error');
          setError(otpError.message);
          return;
        }

        setStatus('sent');
        setOtp('');
        setStep('code');
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } catch (err) {
        setStatus('error');
        setError(formatCatch(err));
        console.error(err);
      }
    },
    [email, redirectTo]
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      });
      if (otpError) {
        setStatus('error');
        setError(otpError.message);
        return;
      }
      setStatus('sent');
      setOtp('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err) {
      setStatus('error');
      setError(formatCatch(err));
    }
  }, [email, redirectTo, resendCooldown]);

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const code = otp.replace(/\D/g, '');
      if (code.length !== 6) {
        setStatus('error');
        setError('Enter the 6-digit code we emailed you (numbers only).');
        return;
      }
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setStatus('error');
        setError('No email on file. Go back and enter your email, then tap Send code.');
        return;
      }

      setStatus('verifying');
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: code,
          type: 'email',
        });

        if (verifyError) {
          setStatus('error');
          const msg = verifyError.message.toLowerCase();
          if (msg.includes('expired') || msg.includes('invalid')) {
            setError('That code is invalid or expired. Request a new code below.');
          } else {
            setError(verifyError.message);
          }
          return;
        }

        if (data.session?.access_token && data.session?.refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (setSessionError) {
            setStatus('error');
            setError(setSessionError.message);
            return;
          }
        }

        const user = data.user;
        if (!user) {
          setStatus('error');
          setError('Could not finish signing you in. Please try again.');
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setError(
            'We verified your code, but couldn’t establish a session in this browser. Try disabling private browsing, allowing site storage, or try another browser/device.'
          );
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
          // ignore
        }

        try {
          sessionStorage.removeItem(AUTH_EMAIL_KEY);
        } catch {
          // ignore
        }

        router.replace(routeAfterAuth(profile, nextParam));
      } catch (err) {
        setStatus('error');
        setError(formatCatch(err));
        console.error(err);
      }
    },
    [email, otp, nextParam, router]
  );

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
      console.error(err);
    }
  }, [redirectTo]);

  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
  }, []);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
  }, []);

  const goBackToEmail = useCallback(() => {
    setStep('email');
    setStatus('idle');
    setError(null);
    setOtp('');
  }, []);

  const goBackToEntry = useCallback(() => {
    setStep('entry');
    setStatus('idle');
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <div className="min-h-screen flex flex-col">
        <header className="px-4 py-5">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Logo size="md" linkToHome />
            <Link href="/" className="text-sm text-muted hover:text-text transition-colors">
              Back
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 pb-10">
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border border-border bg-surface shadow-sm">
              <div className="p-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Find local help without the guesswork.
                </h1>
                <p className="text-muted mt-2">
                  Sign in to browse pros, send a request, and message on-platform. You can add details later.
                </p>

                {error && (
                  <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">
                    {error}
                  </div>
                )}
                {supabaseReachability !== 'checking' && supabaseReachability !== 'ok' && (
                  <div className="mt-4 rounded-xl border border-border bg-surface2 px-4 py-3 text-xs text-muted">
                    It looks like your network can’t reach Supabase right now. Try a VPN or a different network.
                  </div>
                )}

                {/* Step A: Entry — email button + Google */}
                {step === 'entry' && (
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      Continue with email (6-digit code)
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogle}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors disabled:opacity-50"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      Continue with Google
                    </button>

                    <div className="pt-1 text-xs text-muted/70 leading-relaxed">
                      We’ll email you a 6-digit code. No password needed for the email option.
                    </div>

                    <div className="pt-2 text-sm text-muted">
                      Already have an account?{' '}
                      <Link href={nextParam ? `/signin?next=${encodeURIComponent(nextParam)}` : '/signin'} className="text-text hover:opacity-80 font-medium">
                        Sign in
                      </Link>
                    </div>
                  </div>
                )}

                {/* Step A (email form): Email input + Send code */}
                {step === 'email' && (
                  <form onSubmit={handleSendCode} className="mt-6 space-y-4">
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
                    </div>

                    <button
                      type="submit"
                      disabled={status === 'sending' || !email.trim()}
                      className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                    >
                      {status === 'sending' ? 'Sending…' : 'Send code'}
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogle}
                      disabled={status === 'sending'}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors disabled:opacity-50"
                    >
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={goBackToEntry}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors"
                    >
                      Back
                    </button>
                  </form>
                )}

                {/* Step B: OTP input + Verify + Resend + Change email */}
                {step === 'code' && (
                  <div className="mt-6">
                    <div className="rounded-xl border border-border bg-surface2 px-4 py-4">
                      <div className="font-medium text-text">Enter the 6-digit code we emailed you</div>
                      <div className="text-sm text-muted mt-1">
                        We sent a code to <span className="font-medium text-text">{email}</span>. Code expires soon.
                      </div>
                      <p className="text-xs text-muted mt-2">
                        Didn’t get it? Check spam or promotions, or resend below.
                      </p>

                      <form onSubmit={handleVerifyCode} className="mt-4 space-y-3">
                        <div>
                          <label htmlFor="auth-otp" className="block text-sm font-medium text-muted mb-1">
                            6-digit code
                          </label>
                          <input
                            ref={otpInputRef}
                            id="auth-otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otp}
                            onChange={handleOtpChange}
                            onPaste={handleOtpPaste}
                            placeholder="000000"
                            maxLength={6}
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-xl tracking-[0.4em] text-text placeholder:text-muted/50 placeholder:tracking-normal outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                            aria-describedby="otp-hint"
                          />
                          <p id="otp-hint" className="sr-only">Enter the 6-digit code from your email (numbers only).</p>
                        </div>
                        <button
                          type="submit"
                          disabled={status === 'verifying' || otp.replace(/\D/g, '').length !== 6}
                          className="w-full rounded-xl bg-accent px-4 py-3 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                        >
                          {status === 'verifying' ? 'Verifying…' : 'Verify code'}
                        </button>
                      </form>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={status === 'sending' || resendCooldown > 0}
                          className="rounded-xl bg-surface border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : status === 'sending' ? 'Sending…' : 'Resend code'}
                        </button>
                        <button
                          type="button"
                          onClick={goBackToEmail}
                          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface2 transition-colors"
                        >
                          Change email
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}
