'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { AuthSocialButton } from '@/components/auth/AuthSocialButton';
import { EmailOtpForm } from '@/components/auth/EmailOtpForm';
import { signIn, signUp } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type UserRole = 'customer' | 'pro';
type AuthMethod = 'email' | 'google';

const TERMS_VERSION = '2026-01-27';

/**
 * Main sign-in / sign-up page. Reads `role`, `mode`, `next`, `message` from the URL (useSearchParams).
 * Redirects if already signed in (client-side).
 */
export function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleRaw = searchParams.get('role');
  const modeRaw = searchParams.get('mode');
  const nextParam = searchParams.get('next');
  const messageParam = searchParams.get('message');

  const role: UserRole = roleRaw === 'pro' ? 'pro' : 'customer';
  const [isSignUp, setIsSignUp] = useState(modeRaw === 'signup');

  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthSending, setOauthSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  /** Pass to OTP forms only in “Create account” mode so new users get the right role in metadata. */
  const createAccountRole = isSignUp ? role : undefined;

  const redirectTo = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/auth/callback`;
    if (nextParam && nextParam.startsWith('/')) {
      return `${base}?next=${encodeURIComponent(nextParam)}`;
    }
    return base;
  }, [nextParam]);

  useEffect(() => {
    setError(null);
    setPendingConfirm(false);
  }, [isSignUp]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (cancelled) return;
        const userRole = (profile?.role as UserRole | null) ?? (session.user.user_metadata?.role as UserRole | null) ?? 'customer';
        const defaultDest = userRole === 'pro' ? '/pro' : '/customer';
        let dest = defaultDest;
        if (nextParam && nextParam.startsWith('/')) {
          const decoded = decodeURIComponent(nextParam);
          const roleMismatch =
            (decoded.startsWith('/pro') && userRole !== 'pro') ||
            (decoded.startsWith('/customer') && userRole !== 'customer');
          if (!roleMismatch) dest = decoded;
        }
        router.replace(dest);
      } catch {
        // ignore - just show the form
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router, nextParam]);

  const selectAuthMethod = useCallback((m: AuthMethod) => {
    setAuthMethod(m);
    setError(null);
  }, []);

  const formatCatch = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      const msg = err.message || 'Unknown error';
      if (msg.toLowerCase().includes('failed to fetch')) {
        return 'Network error. Try a different network.';
      }
      return msg;
    }
    return 'Something went wrong. Please try again.';
  }, []);

  const handleGoogle = useCallback(async () => {
    setError(null);
    setOauthSending(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError(formatCatch(err));
    } finally {
      setOauthSending(false);
    }
  }, [redirectTo, formatCatch]);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPendingConfirm(false);

    const timeoutMs = 15000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Check your connection or try again.')), timeoutMs);
    });

    try {
      const result = await Promise.race([
        isSignUp ? signUp(role, email, password) : signIn(email, password),
        timeoutPromise,
      ]);

      if (result.success && result.user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (isSignUp) {
              setPendingConfirm(true);
              return;
            }
            setError('You\u2019re not fully signed in yet. Try turning off private browsing and allow site storage.');
            return;
          }
        } catch {
          // ignore
        }

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

        const defaultDest = result.user.role === 'pro' ? '/pro' : '/customer';
        const nextDest = nextParam && nextParam.startsWith('/') ? decodeURIComponent(nextParam) : null;
        const dest =
          nextDest &&
          !(
            (nextDest.startsWith('/pro') && result.user.role !== 'pro') ||
            (nextDest.startsWith('/customer') && result.user.role !== 'customer')
          )
            ? nextDest
            : defaultDest;

        router.replace(dest);
      } else {
        setError(result.error || 'Unable to continue. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tabBusy = oauthSending;
  const nextQuery =
    `${isSignUp ? '&mode=signup' : ''}${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}`;

  return (
    <div className="min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-gradient-to-b from-bg via-surface to-bg text-text flex flex-col">
      <header className="safe-area-top px-4 py-3 sm:py-4">
        <div className="max-w-6xl w-full min-w-0 mx-auto flex items-center justify-between gap-3">
          <Logo size="md" />
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted hover:text-text transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                role === 'customer' ? 'bg-success/15 text-text border border-border' : 'bg-warning/15 text-text border border-border'
              }`}
            >
              {role === 'customer' ? 'Customer Account' : 'Service Pro Account'}
            </div>
            <h1 className="text-2xl font-bold text-text">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
            <p className="text-muted mt-2">
              {isSignUp
                ? role === 'customer'
                  ? 'Browse pros and send requests when you\u2019re ready.'
                  : 'Get set up to receive requests, respond, and manage your schedule.'
                : 'Sign in to continue where you left off.'}
            </p>
            <p className="text-sm font-medium text-text mt-3">Choose the fastest way to continue</p>
          </div>

          <div className="flex mb-5 bg-surface2 border border-border rounded-xl p-1">
            <Link
              href={`/signin?role=customer${nextQuery}`}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'customer' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Customer
            </Link>
            <Link
              href={`/signin?role=pro${nextQuery}`}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'pro' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Service Pro
            </Link>
          </div>

          <div className="flex mb-6 bg-surface2 border border-border rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !isSignUp ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isSignUp ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Create Account
            </button>
          </div>

          {messageParam && (
            <div className="mb-4 bg-success/15 text-text px-4 py-3 rounded-lg text-sm border border-success/30">
              {decodeURIComponent(messageParam)}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-danger/10 text-text px-4 py-3 rounded-lg text-sm border border-red-100">
              {error}
              {error.toLowerCase().includes('incorrect email or password') && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      selectAuthMethod('email');
                    }}
                    className="text-left underline underline-offset-4 hover:opacity-80 font-medium"
                  >
                    Try email code instead (Email tab) →
                  </button>
                </div>
              )}
              {error.toLowerCase().includes('timed out') && (
                <div className="mt-2 text-xs">
                  Try{' '}
                  <Link
                    href={`/signin?use_proxy=1${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}${role === 'pro' ? '&role=pro' : ''}`}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    via proxy
                  </Link>
                  {' or '}
                  <Link
                    href={`/signin?use_proxy=0${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}${role === 'pro' ? '&role=pro' : ''}`}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    direct connection
                  </Link>
                  .
                </div>
              )}
            </div>
          )}

          {pendingConfirm && (
            <div className="mb-4 bg-surface2 text-text px-4 py-3 rounded-lg text-sm border border-border">
              Check your email to confirm your account, then come back and sign in.
              <div className="mt-1 text-xs text-muted/70">
                Or use the Email tab above to sign in with a 6-digit code.
              </div>
            </div>
          )}

          <div
            className="flex bg-surface2 border border-border rounded-xl p-1 gap-1 mb-5"
            role="tablist"
            aria-label={isSignUp ? 'Sign-up method' : 'Sign-in method'}
          >
            {(
              [
                { id: 'email' as const, label: 'Email' },
                { id: 'google' as const, label: 'Google' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={authMethod === id}
                disabled={tabBusy}
                onClick={() => selectAuthMethod(id)}
                className={`flex-1 min-h-[44px] px-2 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  authMethod === id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Keep email panel mounted so switching Email ↔ Google preserves OTP progress. */}
          <div
            className={authMethod === 'email' ? 'block' : 'hidden'}
            role="tabpanel"
            aria-hidden={authMethod !== 'email'}
          >
            <EmailOtpForm nextPath={nextParam} createAccountRole={createAccountRole} />
          </div>
          <div
            className={authMethod === 'google' ? 'block space-y-4' : 'hidden'}
            role="tabpanel"
            aria-hidden={authMethod !== 'google'}
          >
            <p className="text-sm text-muted">
              Continue with your Google account. You&apos;ll finish on Google, then return here.
            </p>
            <AuthSocialButton
              provider="google"
              label="Continue with Google"
              onClick={() => void handleGoogle()}
              disabled={oauthSending}
            />
          </div>

          <div className="mt-6 text-center border-t border-border pt-5">
            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(true);
                  setError(null);
                }}
                className="text-sm text-muted hover:text-text underline underline-offset-4"
              >
                Prefer password? Sign in with password
              </button>
            ) : (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text">Email & password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setError(null);
                    }}
                    className="text-xs text-muted hover:text-text underline underline-offset-4 shrink-0"
                  >
                    Hide
                  </button>
                </div>
                <form onSubmit={handleSubmitPassword} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full min-h-[48px] px-4 py-3 border border-border rounded-xl bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-muted mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full min-h-[48px] px-4 py-3 border border-border rounded-xl bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    />
                    <div className="mt-1.5 text-right">
                      <Link
                        href={nextParam ? `/auth/forgot-password?next=${encodeURIComponent(nextParam)}` : '/auth/forgot-password'}
                        className="text-sm text-muted hover:text-accent transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[48px] py-3 rounded-xl font-medium transition-opacity bg-surface2 text-text border border-border hover:bg-surface disabled:opacity-50"
                  >
                    {isLoading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in with password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
