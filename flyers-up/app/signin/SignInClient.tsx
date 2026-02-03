'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { getCurrentUser, signIn, signUp } from '@/lib/api';
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

  // Ensure the role accent applies even on auth routes (not wrapped in AppLayout).
  // Layout effect reduces visible “flash” vs useEffect.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-customer', role === 'customer');
    root.classList.toggle('theme-pro', role === 'pro');
  }, [role]);

  useEffect(() => {
    setError(null);
  }, [isSignUp]);

  useEffect(() => {
    const redirectIfAuthed = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      const defaultDest = user.role === 'pro' ? '/pro' : '/customer';
      const nextDest = nextParam && nextParam.startsWith('/') ? decodeURIComponent(nextParam) : null;

      // Prevent role-mismatch “bounce”
      const dest =
        nextDest &&
        !(
          (nextDest.startsWith('/pro') && user.role !== 'pro') ||
          (nextDest.startsWith('/customer') && user.role !== 'customer')
        )
          ? nextDest
          : defaultDest;

      router.replace(dest);
    };
    void redirectIfAuthed();
  }, [router, nextParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = isSignUp ? await signUp(role, email, password) : await signIn(email, password);

      if (result.success && result.user) {
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

        // If sign-up returned no session (email confirmation required), keep them on sign-in.
        if (isSignUp) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            router.replace(`/signin?role=${role}&mode=signup`);
            return;
          }
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
      setError('An unexpected error occurred');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
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
              {isSignUp ? `Sign up as a ${role === 'customer' ? 'customer' : 'service professional'}` : 'Sign in to continue'}
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
              {isLoading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

