'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { useRouter } from 'next/navigation';

const TERMS_VERSION = '2026-01-27';

type Step = 'entry' | 'email';

function AuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const errorParam = searchParams.get('error');

  const [step, setStep] = useState<Step>('entry');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>('idle');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);

  const redirectTo = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/auth/callback`;
    if (nextParam && nextParam.startsWith('/')) {
      return `${base}?next=${encodeURIComponent(nextParam)}`;
    }
    return base;
  }, [nextParam]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('sending');

    try {
      // NOTE: This uses Supabase "signInWithOtp".
      // Supabase sends a Magic Link by default unless your **Magic Link email template**
      // includes `{{ .Token }}` (which shows the 6-digit code).
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Keep redirectTo for compatibility if templates still include links.
          // For Email OTP templates, this won't be used.
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        setStatus('error');
        setError(otpError.message);
        return;
      }

      setStatus('sent');
      // Move to code entry. (If you're still using magic links, user can ignore code entry
      // and click the link; /auth/callback will handle it.)
      setStep('email');
    } catch (err) {
      setStatus('error');
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('verifying');
    try {
      const token = otp.trim();
      if (token.length < 6) {
        setStatus('error');
        setError('Enter the 6-digit code from your email.');
        return;
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        setStatus('error');
        setError(verifyError.message);
        return;
      }

      // In some cases, verifyOtp returns a user but the session isn't fully
      // established in the client yet. Explicitly set it so subsequent RLS-
      // protected queries (like inserting/selecting from `profiles`) work.
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

      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) {
        setStatus('error');
        setError('Could not load your profile. Please try again.');
        return;
      }

      // Best-effort legal acceptance logging (ignores failures).
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/legal/acceptance', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ termsVersion: TERMS_VERSION }),
        });
      } catch {
        // ignore
      }

      router.replace(routeAfterAuth(profile, nextParam));
    } catch (err) {
      setStatus('error');
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  }

  async function handleGoogle() {
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
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
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
                  Local help. Real people. Simple bookings.
                </h1>
                <p className="text-muted mt-2">
                  Get started in a minute. You can add details later.
                </p>

                {error && (
                  <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">
                    {error}
                  </div>
                )}

                {step === 'entry' && (
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      Continue with Email
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogle}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors disabled:opacity-50"
                      disabled={status === 'sending' || status === 'verifying'}
                    >
                      Continue with Google
                    </button>

                    <div className="pt-2 text-sm text-muted">
                      Already have an account?{' '}
                      <Link href={nextParam ? `/signin?next=${encodeURIComponent(nextParam)}` : '/signin'} className="text-text hover:opacity-80 font-medium">
                        Log in
                      </Link>
                    </div>
                  </div>
                )}

                {step === 'email' && (
                  <div className="mt-6">
                    {status !== 'sent' && status !== 'verifying' ? (
                      <form onSubmit={handleSendCode} className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={status === 'sending'}
                          className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                        >
                          {status === 'sending' ? 'Sending…' : 'Send me a code'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStep('entry');
                            setStatus('idle');
                            setError(null);
                          }}
                          className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base font-medium hover:bg-surface2 transition-colors"
                        >
                          Back
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-border bg-surface2 px-4 py-4">
                        <div className="font-medium text-text">Check your email</div>
                        <div className="text-sm text-muted mt-1">
                          We sent a sign-in email to <span className="font-medium">{email}</span>.
                        </div>
                        <div className="text-sm text-muted mt-1">
                          If you received a 6-digit code, enter it below. If you received a link, you can tap it.
                        </div>

                        <form onSubmit={handleVerifyCode} className="mt-4 space-y-3">
                          <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-muted mb-1">
                              6-digit code
                            </label>
                            <input
                              id="otp"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="123456"
                              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={status === 'verifying'}
                            className="w-full rounded-xl bg-accent px-4 py-3 text-base font-medium text-accentContrast hover:opacity-95 transition-opacity disabled:opacity-50"
                          >
                            {status === 'verifying' ? 'Verifying…' : 'Verify and continue'}
                          </button>
                        </form>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('idle');
                              setError(null);
                              setOtp('');
                            }}
                            className="rounded-xl bg-surface border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface2"
                          >
                            Send again
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep('entry')}
                            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accentContrast hover:opacity-95 transition-opacity"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-muted/70 leading-relaxed">
              By continuing, you agree to use Flyers Up respectfully and keep communication on-platform.
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
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}
