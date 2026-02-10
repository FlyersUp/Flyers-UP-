'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { signUp } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type UserRole = 'customer' | 'pro';

const TERMS_VERSION = '2026-01-27';

export function SignUpClient(props: { initialRole: UserRole }) {
  const router = useRouter();
  const role: UserRole = props.initialRole === 'pro' ? 'pro' : 'customer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp(role, email, password);

      if (result.success && result.user) {
        // Best-effort legal acceptance logging (may 401 if email-confirm flow returns no session yet).
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

        setSuccess(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If email confirmation is required, Supabase returns session=null.
        // Don't bounce the user around—show a clear next step instead.
        if (!session) {
          setPendingConfirm(true);
          return;
        }

        router.replace(result.user.role === 'pro' ? '/pro' : '/customer');
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Signup error:', err);
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
              {role === 'customer' ? 'Customer account' : 'Service Pro account'}
            </div>
            <h1 className="text-2xl font-bold text-text">Create your account</h1>
            <p className="text-muted mt-2">
              {role === 'customer'
                ? 'Browse pros and send requests when you’re ready.'
                : 'Get set up to receive requests, respond, and manage your schedule.'}
            </p>
            <p className="text-xs text-muted/70 mt-2">
              Takes about a minute. You can complete your profile after you’re in.
            </p>
          </div>

          <div className="flex mb-6 bg-surface2 border border-border rounded-xl p-1">
            <Link
              href="/signup?role=customer"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'customer' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Customer
            </Link>
            <Link
              href="/signup?role=pro"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all text-center ${
                role === 'pro' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Service Pro
            </Link>
          </div>

          {success && (
            <div className="mb-4 bg-success/15 text-text px-4 py-3 rounded-lg text-sm border border-border">
              Account created. You’re almost in.
            </div>
          )}

          {pendingConfirm && (
            <div className="mb-4 bg-surface2 text-text px-4 py-3 rounded-lg text-sm border border-border">
              Check your email to confirm your account, then come back and sign in.
              <div className="mt-1 text-xs text-muted/70">
                If email links don’t open on your network/device, you can use the email code sign-in instead.
              </div>
              <div className="mt-2">
                <Link href="/auth" className="underline underline-offset-4 hover:opacity-80 font-medium">
                  Sign in with email code →
                </Link>
              </div>
            </div>
          )}

          {error && <div className="mb-4 bg-danger/10 text-text px-4 py-3 rounded-lg text-sm border border-red-100">{error}</div>}

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
              <p className="text-xs text-muted/70 mt-1">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-text placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 rounded-lg font-medium transition-opacity bg-accent text-accentContrast hover:opacity-95 disabled:opacity-50"
            >
              {isLoading ? 'Creating account…' : success ? 'Account created' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link href={`/signin?role=${role}`} className="text-text hover:opacity-80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

