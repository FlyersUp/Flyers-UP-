'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { signIn, signUp } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type UserRole = 'customer' | 'pro';

const TERMS_VERSION = '2026-01-27';

export function SignInClient(props: {
  initialRole: UserRole;
  initialMode?: 'signup' | null;
  nextParam?: string | null;
}) {
  const router = useRouter();

  const role: UserRole = props.initialRole === 'pro' ? 'pro' : 'customer';
  const [isSignUp, setIsSignUp] = useState(props.initialMode === 'signup');

  const nextParam = props.nextParam ?? null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [supabaseReachability, setSupabaseReachability] = useState<'checking' | 'ok' | 'blocked'>('checking');

  useEffect(() => {
    setError(null);
    setPendingConfirm(false);
  }, [isSignUp]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { supabaseHealth } = await import('@/lib/supabaseHealth');
        await supabaseHealth(3000);
        if (!cancelled) setSupabaseReachability('ok');
      } catch {
        if (!cancelled) setSupabaseReachability('blocked');
      }
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Make sure a session actually exists before navigating.
        // For sign-up, Supabase often returns `session: null` when email confirmation is required.
        // For sign-in, missing session usually means the browser blocked storage/cookies.
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            if (isSignUp) {
              setPendingConfirm(true);
              return;
            }

            setError('You’re not fully signed in yet. Try turning off private browsing and allow site storage.');
            return;
          }
        } catch {
          // ignore
        }

        // Best-effort legal acceptance logging (ignores failures).
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex flex-col">
      <header className="px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <Link href="/" className="text-sm text-muted hover:text-text transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
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
                  ? 'Browse pros and send requests when you’re ready.'
                  : 'Get set up to receive requests, respond, and manage your schedule.'
                : 'Sign in to continue where you left off.'}
            </p>
            <p className="text-xs text-muted/70 mt-2">
              Prefer not to use a password? You can sign in with an email code or Google.
            </p>
          </div>

          <div className="flex mb-6 bg-surface2 border border-border rounded-xl p-1">
            <Link
              href={`/signin?role=customer${isSignUp ? '&mode=signup' : ''}`}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'customer' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Customer
            </Link>
            <Link
              href={`/signin?role=pro${isSignUp ? '&mode=signup' : ''}`}
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

          {error && (
            <div className="mb-4 bg-danger/10 text-text px-4 py-3 rounded-lg text-sm border border-red-100">
              {error}
              {error.toLowerCase().includes('incorrect email or password') && (
                <div className="mt-2">
                  <Link
                    href={nextParam ? `/auth?next=${encodeURIComponent(nextParam)}` : '/auth'}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    Try “Continue with Email” (code) instead →
                  </Link>
                </div>
              )}
              {error.toLowerCase().includes('/auth sign-in') && (
                <div className="mt-2">
                  <Link
                    href={nextParam ? `/auth?next=${encodeURIComponent(nextParam)}` : '/auth'}
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    Continue with Email (code) or Google →
                  </Link>
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
                We sent you a 6-digit code or confirmation link. You can also sign in with the email code flow.
              </div>
              <div className="mt-2">
                <Link href="/auth" className="underline underline-offset-4 hover:opacity-80 font-medium">
                  Sign in with 6-digit email code →
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
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
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium transition-opacity bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50"
            >
              {isLoading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {supabaseReachability !== 'checking' && supabaseReachability !== 'ok' && (
            <div className="mt-4 rounded-lg border border-border bg-surface2 px-4 py-3 text-xs text-muted">
              It looks like your network can’t reach Supabase right now. If you’re in Yemen (or on a restricted ISP),
              try a VPN or a different network.
            </div>
          )}

          <div className="mt-6 text-center">
            <div className="text-xs text-muted/70">Having trouble? Use email code or Google sign-in.</div>
            <div className="mt-2">
              <Link
                href={nextParam ? `/auth?next=${encodeURIComponent(nextParam)}` : '/auth'}
                className="text-sm font-medium text-text underline underline-offset-4 decoration-border hover:decoration-text"
              >
                Continue with email code or Google →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

