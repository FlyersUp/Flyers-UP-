'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import AuthLoadingFallback from '@/components/AuthLoadingFallback';
import { AuthSocialButton } from '@/components/auth/AuthSocialButton';
import { EmailOtpForm } from '@/components/auth/EmailOtpForm';
import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { useRouter } from 'next/navigation';

type AuthMethod = 'phone' | 'email' | 'google';

function AuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const deniedParam = searchParams.get('denied');

  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [adminDenied, setAdminDenied] = useState<{ email: string; role: string | null } | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');

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
                  Sign in to browse pros, send a request, and message on-platform. Add profile details anytime after
                  you&apos;re in.
                </p>
                <p className="text-sm font-medium text-text mt-3">Choose the fastest way to continue</p>

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

                <div className="mt-5 space-y-5">
                  <div
                    className="flex bg-surface2 border border-border rounded-xl p-1 gap-1"
                    role="tablist"
                    aria-label="Sign-in method"
                  >
                    {(
                      [
                        { id: 'phone' as const, label: 'Phone' },
                        { id: 'email' as const, label: 'Email' },
                        { id: 'google' as const, label: 'Google' },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={authMethod === id}
                        disabled={status === 'sending'}
                        onClick={() => {
                          setAuthMethod(id);
                          setError(null);
                        }}
                        className={`flex-1 min-h-[44px] px-2 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                          authMethod === id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div role="tabpanel">
                    {authMethod === 'phone' && <PhoneOtpForm nextPath={nextParam} />}
                    {authMethod === 'email' && <EmailOtpForm nextPath={nextParam} />}
                    {authMethod === 'google' && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted">
                          Continue with your Google account. You&apos;ll finish signing in on Google, then come back
                          here.
                        </p>
                        <AuthSocialButton
                          provider="google"
                          label="Continue with Google"
                          onClick={handleGoogle}
                          disabled={status === 'sending'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-1 text-center text-sm text-muted">
                    Prefer a password?{' '}
                    <Link
                      href={nextParam ? `/signin?next=${encodeURIComponent(nextParam)}` : '/signin'}
                      className="font-medium text-text hover:opacity-80"
                    >
                      Sign in with email & password →
                    </Link>
                    <span className="mt-1 block text-xs text-muted/80">
                      Email tab above sends a 6-digit code (no password).
                    </span>
                  </div>
                </div>
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
